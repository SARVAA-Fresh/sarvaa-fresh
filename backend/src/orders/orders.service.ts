import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private generateOrderNumber(): string {
    return `ORD-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  }

  private buildAddressSnapshot(address: any) {
    const parts = [
      address.addressLine1,
      address.addressLine2,
      address.landmark,
      address.area,
    ].filter(Boolean);
    return {
      deliveryName: address.fullName,
      deliveryPhone: address.mobile,
      deliveryAddress: parts.join(', '),
      deliveryCity: address.city,
      deliveryState: address.state,
      deliveryPincode: address.pincode,
    };
  }

  async create(userId: string, dto: CreateOrderDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          where: { deletedAt: null },
          include: { variant: { include: { product: true } } },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const address = await this.prisma.address.findUnique({
      where: { id: dto.addressId },
    });

    if (!address || address.deletedAt) {
      throw new NotFoundException('Address not found');
    }

    if (address.userId !== userId) {
      throw new ForbiddenException('You can only use your own addresses');
    }

    // Validate inventory for each item
    for (const item of cart.items) {
      const inventory = await this.prisma.inventory.findUnique({
        where: { variantId: item.variantId },
      });
      if (!inventory || inventory.deletedAt) {
        throw new BadRequestException(
          `Product variant ${item.variant.product.name} is out of stock`,
        );
      }
      if (inventory.availableStock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${item.variant.product.name}. Available: ${inventory.availableStock}, Requested: ${item.quantity}`,
        );
      }
    }

    let subtotal = new Prisma.Decimal(0);
    for (const item of cart.items) {
      subtotal = subtotal.add(new Prisma.Decimal(item.totalPrice.toString()));
    }

    const deliveryFee = new Prisma.Decimal(0);
    const totalAmount = subtotal.add(deliveryFee);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create order with address snapshot
      const order = await tx.order.create({
        data: {
          userId,
          addressId: dto.addressId,
          orderNumber: this.generateOrderNumber(),
          subtotal,
          deliveryFee,
          totalAmount,
          currentStatus: 'PENDING',
          paymentStatus: 'PENDING',
          ...this.buildAddressSnapshot(address),
        },
      });

      // 2. Create order items
      for (const item of cart.items) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            variantId: item.variantId,
            productNameSnapshot: item.variant.product.name,
            unitPrice: new Prisma.Decimal(item.variant.price.toString()),
            quantity: item.quantity,
            totalPrice: new Prisma.Decimal(item.totalPrice.toString()),
          },
        });
      }

      // 3. Reserve inventory
      for (const item of cart.items) {
        const inv = await tx.inventory.findUnique({
          where: { variantId: item.variantId },
        });
        if (!inv) {
          throw new BadRequestException(
            `Inventory not found for variant ${item.variantId}`,
          );
        }
        const newAvailable = inv.availableStock - item.quantity;
        const newReserved = inv.reservedStock + item.quantity;

        await tx.inventory.update({
          where: { variantId: item.variantId },
          data: {
            availableStock: newAvailable,
            reservedStock: newReserved,
            isInStock: newAvailable > 0,
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            variantId: item.variantId,
            inventoryId: inv.id,
            type: 'RESERVE',
            quantityChange: -item.quantity,
            availableStockAfter: newAvailable,
            reservedStockAfter: newReserved,
            reason: 'Stock reserved for order',
            referenceId: order.id,
            referenceType: 'Order',
          },
        });
      }

      // 4. Clear cart items
      await tx.cartItem.updateMany({
        where: { cartId: cart.id, deletedAt: null },
        data: { deletedAt: new Date() },
      });

      // 5. Reset cart subtotal
      await tx.cart.update({
        where: { id: cart.id },
        data: { subtotal: new Prisma.Decimal(0) },
      });

      return tx.order.findUnique({
        where: { id: order.id },
        include: { items: true },
      });
    });
  }

  async findAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId, deletedAt: null },
        include: { items: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where: { userId, deletedAt: null } }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(userId: string, id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order || order.deletedAt) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('You can only access your own orders');
    }

    return order;
  }

  async cancel(userId: string, id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order || order.deletedAt) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own orders');
    }

    if (!['PENDING', 'CONFIRMED'].includes(order.currentStatus)) {
      throw new BadRequestException(
        'Order can only be cancelled before packing',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Release reserved inventory
      for (const item of order.items) {
        const inv = await tx.inventory.findUnique({
          where: { variantId: item.variantId },
        });
        if (!inv) {
          throw new BadRequestException(
            `Inventory not found for variant ${item.variantId}`,
          );
        }
        const newAvailable = inv.availableStock + item.quantity;
        const newReserved = inv.reservedStock - item.quantity;

        await tx.inventory.update({
          where: { variantId: item.variantId },
          data: {
            availableStock: newAvailable,
            reservedStock: newReserved,
            isInStock: newAvailable > 0,
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            variantId: item.variantId,
            inventoryId: inv.id,
            type: 'RELEASE',
            quantityChange: item.quantity,
            availableStockAfter: newAvailable,
            reservedStockAfter: newReserved,
            reason: 'Stock released from cancelled order',
            referenceId: order.id,
            referenceType: 'Order',
          },
        });
      }

      return tx.order.update({
        where: { id },
        data: { currentStatus: 'CANCELLED' },
        include: { items: true },
      });
    });
  }
}
