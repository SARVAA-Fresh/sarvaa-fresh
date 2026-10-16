import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { InventoryService } from '@/inventory/inventory.service';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Order, OrderStatus } from '@prisma/client';
import { NotificationsService } from '@/notifications/notifications.service';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.PACKING, OrderStatus.CANCELLED],
  PACKING: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
  OUT_FOR_DELIVERY: [OrderStatus.DELIVERED],
  DELIVERED: [],
  CANCELLED: [],
};

type OrderWithItems = Order & {
  items: Array<{
    variantId: string;
    quantity: number;
    unitPrice: unknown;
    totalPrice: unknown;
    productNameSnapshot: string;
    id: string;
    orderId: string;
  }>;
  user?: { id: string; fullName: string; mobile: string; email: string } | null;
  payments?: unknown[];
  statusHistory?: unknown[];
};

export interface FormattedOrder {
  id: string;
  userId: string;
  addressId: string;
  orderNumber: string;
  subtotal: string;
  deliveryFee: string;
  totalAmount: string;
  currentStatus: OrderStatus;
  paymentStatus: string;
  notes: string | null;
  deliveryName: string | null;
  deliveryPhone: string | null;
  deliveryAddress: string | null;
  deliveryCity: string | null;
  deliveryState: string | null;
  deliveryPincode: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  items: OrderWithItems['items'];
  user?: OrderWithItems['user'];
}

@Injectable()
export class AdminOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly notifications: NotificationsService,
  ) {}

  private formatDecimal(val: unknown): string {
    if (val === null || val === undefined) return '0';
    if (typeof val === 'object' && val !== null && 'toString' in val) {
      return (val as { toString: () => string }).toString();
    }
    return String(val);
  }

  private formatOrder(order: OrderWithItems): FormattedOrder {
    return {
      ...order,
      subtotal: this.formatDecimal(order.subtotal),
      deliveryFee: this.formatDecimal(order.deliveryFee),
      totalAmount: this.formatDecimal(order.totalAmount),
    } as FormattedOrder;
  }

  async findAll(query: ListOrdersQueryDto): Promise<{
    items: FormattedOrder[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      deletedAt: null,
    };

    if (query.status) {
      where.currentStatus = query.status;
    }

    if (query.paymentStatus) {
      where.paymentStatus = query.paymentStatus;
    }

    if (query.orderNumber) {
      where.orderNumber = { contains: query.orderNumber, mode: 'insensitive' };
    }

    if (query.customerMobile) {
      where.user = { mobile: { contains: query.customerMobile, mode: 'insensitive' } };
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, mobile: true, email: true } },
          items: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: items.map((o) => this.formatOrder(o as OrderWithItems)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<FormattedOrder> {
    const order = await this.prisma.order.findFirst({
      where: { id, deletedAt: null },
      include: {
        items: true,
        user: { select: { id: true, fullName: true, mobile: true, email: true } },
        payments: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.formatOrder(order as OrderWithItems);
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
  ): Promise<FormattedOrder> {
    const order = await this.prisma.order.findFirst({
      where: { id, deletedAt: null },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const currentStatus = order.currentStatus;
    const targetStatus = dto.status;

    if (currentStatus === targetStatus) {
      return this.formatOrder(order as OrderWithItems);
    }

    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${targetStatus}. Allowed transitions: ${allowed.length > 0 ? allowed.join(', ') : 'none'}`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id },
        data: { currentStatus: targetStatus },
        include: { items: true },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status: targetStatus,
          remarks: dto.remarks,
          updatedByAdminId: null,
        },
      });

      if (targetStatus === OrderStatus.DELIVERED) {
        for (const item of order.items) {
          await this.inventoryService.confirmStockDeduction(
            item.variantId,
            item.quantity,
            order.id,
          );
        }
      }

      return updatedOrder;
    });

    await this.notifications.notifyCustomerOfOrderStatus(
      updated.id,
      updated.orderNumber,
      order.userId,
      targetStatus,
    );

    return this.formatOrder(updated as OrderWithItems);
  }

  async cancel(id: string): Promise<FormattedOrder> {
    const order = await this.prisma.order.findFirst({
      where: { id, deletedAt: null },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.currentStatus === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order is already cancelled');
    }

    if (
      order.currentStatus === OrderStatus.OUT_FOR_DELIVERY ||
      order.currentStatus === OrderStatus.DELIVERED
    ) {
      throw new BadRequestException(
        'Cannot cancel an order after it is out for delivery',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await this.inventoryService.releaseStock(
          item.variantId,
          item.quantity,
          order.id,
        );
      }

      const updatedOrder = await tx.order.update({
        where: { id },
        data: { currentStatus: OrderStatus.CANCELLED },
        include: { items: true },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status: OrderStatus.CANCELLED,
          remarks: 'Order Cancelled',
          updatedByAdminId: null,
        },
      });

      return updatedOrder;
    });

    return this.formatOrder(updated as OrderWithItems);
  }

  async getStats(): Promise<{
    todayOrders: number;
    todayRevenue: string;
    pendingOrders: number;
    packingOrders: number;
    outForDeliveryOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
  }> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );

    const whereToday = {
      createdAt: { gte: startOfDay, lte: endOfDay },
      deletedAt: null,
    };

    const [
      todayOrders,
      todayRevenueAgg,
      pendingOrders,
      packingOrders,
      outForDeliveryOrders,
      deliveredOrders,
      cancelledOrders,
    ] = await Promise.all([
      this.prisma.order.count({ where: { ...whereToday } }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: whereToday,
      }),
      this.prisma.order.count({
        where: { currentStatus: OrderStatus.PENDING, deletedAt: null },
      }),
      this.prisma.order.count({
        where: { currentStatus: OrderStatus.PACKING, deletedAt: null },
      }),
      this.prisma.order.count({
        where: { currentStatus: OrderStatus.OUT_FOR_DELIVERY, deletedAt: null },
      }),
      this.prisma.order.count({
        where: { currentStatus: OrderStatus.DELIVERED, deletedAt: null },
      }),
      this.prisma.order.count({
        where: { currentStatus: OrderStatus.CANCELLED, deletedAt: null },
      }),
    ]);

    return {
      todayOrders,
      todayRevenue: this.formatDecimal(todayRevenueAgg._sum.totalAmount),
      pendingOrders,
      packingOrders,
      outForDeliveryOrders,
      deliveredOrders,
      cancelledOrders,
    };
  }
}
