import { Injectable } from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private formatDecimal(val: unknown): string {
    if (val === null || val === undefined) return '0.00';
    if (typeof val === 'object' && val !== null && 'toString' in val) {
      const raw = (val as { toString: () => string }).toString();
      return this.ensureTwoDecimals(raw);
    }
    return this.ensureTwoDecimals(String(val));
  }

  private ensureTwoDecimals(raw: string): string {
    const num = Number(raw);
    if (!Number.isFinite(num)) return '0.00';
    return num.toFixed(2);
  }

  async getSummary(): Promise<{
    counts: {
      activeProducts: number;
      activeCategories: number;
      lowStockVariants: number;
    };
    ordersToday: {
      count: number;
      revenue: string;
    };
    ordersByStatus: Record<OrderStatus, number>;
  }> {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );

    const statuses = Object.values(OrderStatus);

    const [activeProducts, activeCategories, inventories, ordersTodayCount, revenueAgg, ...statusCounts] =
      await Promise.all([
        this.prisma.product.count({
          where: { isActive: true, deletedAt: null },
        }),
        this.prisma.category.count({
          where: { isActive: true, deletedAt: null },
        }),
        this.prisma.inventory.findMany({
          where: { deletedAt: null, availableStock: { gt: 0 } },
          select: { availableStock: true, lowStockThreshold: true },
        }),
        this.prisma.order.count({
          where: {
            deletedAt: null,
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        }),
        this.prisma.order.aggregate({
          _sum: { totalAmount: true },
          where: {
            deletedAt: null,
            createdAt: { gte: startOfDay, lte: endOfDay },
            paymentStatus: PaymentStatus.PAID,
            currentStatus: { not: OrderStatus.CANCELLED },
          },
        }),
        ...statuses.map((status) =>
          this.prisma.order.count({
            where: { currentStatus: status, deletedAt: null },
          }),
        ),
      ]);

    const lowStockVariants = inventories.filter(
      (i) => i.availableStock <= i.lowStockThreshold,
    ).length;

    const ordersByStatus = Object.fromEntries(
      statuses.map((status, idx) => [status, statusCounts[idx]]),
    ) as Record<OrderStatus, number>;

    return {
      counts: {
        activeProducts,
        activeCategories,
        lowStockVariants,
      },
      ordersToday: {
        count: ordersTodayCount,
        revenue: this.formatDecimal(revenueAgg._sum.totalAmount),
      },
      ordersByStatus,
    };
  }
}
