import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { InventoryService } from '@/inventory/inventory.service';
import { NotificationTransport } from '@/notifications/notification-transport';
import { NotificationsService } from '@/notifications/notifications.service';
import { PrismaService } from '@/prisma/prisma.service';
import { OrderStatus, Prisma } from '@prisma/client';
import { AdminOrdersService } from './admin-orders.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

describe('AdminOrdersService notification boundary', () => {
  it('does not notify for an idempotent status update', async () => {
    const currentOrder = {
      id: 'order-id',
      orderNumber: 'ORD-123',
      userId: 'customer-id',
      currentStatus: OrderStatus.CONFIRMED,
      items: [],
    };
    const prisma = {
      order: { findFirst: jest.fn().mockResolvedValue(currentOrder) },
      $transaction: jest.fn(),
    } as unknown as PrismaService;
    const notifications = {
      notifyCustomerOfOrderStatus: jest.fn(),
    } as unknown as NotificationsService;
    const service = new AdminOrdersService(
      prisma,
      {} as InventoryService,
      notifications,
    );

    await expect(
      service.updateStatus('order-id', {
        status: OrderStatus.CONFIRMED,
      } as UpdateOrderStatusDto),
    ).resolves.toMatchObject({ currentStatus: OrderStatus.CONFIRMED });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(notifications.notifyCustomerOfOrderStatus).not.toHaveBeenCalled();
  });

  it('dispatches the customer event after commit and isolates transport failure', async () => {
    let committed = false;
    const currentOrder = {
      id: 'order-id',
      orderNumber: 'ORD-123',
      userId: 'customer-id',
      currentStatus: OrderStatus.PENDING,
      items: [],
    };
    const updatedOrder = {
      ...currentOrder,
      currentStatus: OrderStatus.CONFIRMED,
      subtotal: '10',
      deliveryFee: '0',
      totalAmount: '10',
    };
    const transactionClient = {
      order: {
        update: jest.fn().mockResolvedValue(updatedOrder),
      },
      orderStatusHistory: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    };
    const transaction = jest.fn(async (callback: (tx: typeof transactionClient) => Promise<unknown>) => {
      const result = await callback(transactionClient);
      committed = true;
      return result;
    });
    const prisma = {
      order: { findFirst: jest.fn().mockResolvedValue(currentOrder) },
      $transaction: transaction,
    } as unknown as PrismaService;
    const inventoryService = {
      confirmStockDeductionInTransaction: jest.fn(),
      releaseStockInTransaction: jest.fn(),
    } as unknown as InventoryService;
    const transport = {
      dispatch: jest.fn(async () => {
        expect(committed).toBe(true);
        throw new Error('transport unavailable');
      }),
    } as unknown as NotificationTransport;
    const config = {
      get: jest.fn(() => 'true'),
    } as unknown as ConfigService;
    const notifications = new NotificationsService(config, transport);
    const service = new AdminOrdersService(prisma, inventoryService, notifications);

    await expect(
      service.updateStatus('order-id', {
        status: OrderStatus.CONFIRMED,
      } as UpdateOrderStatusDto),
    ).resolves.toMatchObject({ currentStatus: OrderStatus.CONFIRMED });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(inventoryService.confirmStockDeductionInTransaction).not.toHaveBeenCalled();
    expect(inventoryService.releaseStockInTransaction).not.toHaveBeenCalled();
    expect(transport.dispatch).toHaveBeenCalledWith({
      type: 'customer.order_status_changed',
      orderId: 'order-id',
      orderNumber: 'ORD-123',
      customerId: 'customer-id',
      status: OrderStatus.CONFIRMED,
    });
  });

  it('deducts delivery stock on the same transaction as status completion', async () => {
    let committed = false;
    const currentOrder = {
      id: 'order-id',
      orderNumber: 'ORD-123',
      userId: 'customer-id',
      currentStatus: OrderStatus.OUT_FOR_DELIVERY,
      items: [{ variantId: 'variant-id', quantity: 2 }],
    };
    const updatedOrder = {
      ...currentOrder,
      currentStatus: OrderStatus.DELIVERED,
      subtotal: '10',
      deliveryFee: '0',
      totalAmount: '10',
    };
    const transactionClient = {
      order: { update: jest.fn().mockResolvedValue(updatedOrder) },
      orderStatusHistory: { create: jest.fn().mockResolvedValue(undefined) },
    };
    const transaction = jest.fn(async (callback: (tx: typeof transactionClient) => Promise<unknown>) => {
      const result = await callback(transactionClient);
      committed = true;
      return result;
    });
    const prisma = {
      order: { findFirst: jest.fn().mockResolvedValue(currentOrder) },
      $transaction: transaction,
    } as unknown as PrismaService;
    const inventoryService = {
      confirmStockDeductionInTransaction: jest.fn(async (tx: unknown) => {
        expect(tx).toBe(transactionClient);
        expect(committed).toBe(false);
      }),
    } as unknown as InventoryService;
    const notifications = {
      notifyCustomerOfOrderStatus: jest.fn(async () => {
        expect(committed).toBe(true);
      }),
    } as unknown as NotificationsService;
    const service = new AdminOrdersService(prisma, inventoryService, notifications);

    await expect(
      service.updateStatus('order-id', {
        status: OrderStatus.DELIVERED,
      } as UpdateOrderStatusDto),
    ).resolves.toMatchObject({ currentStatus: OrderStatus.DELIVERED });

    expect(inventoryService.confirmStockDeductionInTransaction).toHaveBeenCalledWith(
      transactionClient,
      'variant-id',
      2,
      'order-id',
    );
    expect(notifications.notifyCustomerOfOrderStatus).toHaveBeenCalledTimes(1);
  });

  it('releases admin-cancelled stock only after winning the status transition', async () => {
    const order = {
      id: 'order-id',
      orderNumber: 'ORD-123',
      userId: 'customer-id',
      currentStatus: OrderStatus.PENDING,
      deletedAt: null,
      items: [{ variantId: 'variant-id', quantity: 3 }],
    };
    let currentStatus: OrderStatus = OrderStatus.PENDING;
    const transactionOrderUpdate = jest.fn(async (args: {
      where: { currentStatus: { in: OrderStatus[] } };
      data: { currentStatus: OrderStatus };
    }) => {
      if (!args.where.currentStatus.in.includes(currentStatus)) {
        throw new Prisma.PrismaClientKnownRequestError(
          'Order status changed',
          { code: 'P2025', clientVersion: '5.22.0' },
        );
      }
      currentStatus = args.data.currentStatus;
      return { ...order, currentStatus };
    });
    const transactionClient = {
      order: { update: transactionOrderUpdate },
      orderStatusHistory: { create: jest.fn().mockResolvedValue(undefined) },
    };
    const transaction = jest.fn((callback: (tx: typeof transactionClient) => Promise<unknown>) =>
      callback(transactionClient),
    );
    const prisma = {
      order: { findFirst: jest.fn().mockResolvedValue(order) },
      $transaction: transaction,
    } as unknown as PrismaService;
    const inventoryService = {
      releaseStockInTransaction: jest.fn().mockResolvedValue(undefined),
    } as unknown as InventoryService;
    const service = new AdminOrdersService(
      prisma,
      inventoryService,
      {} as NotificationsService,
    );

    await expect(service.cancel('order-id')).resolves.toMatchObject({
      currentStatus: OrderStatus.CANCELLED,
    });
    await expect(service.cancel('order-id')).rejects.toThrow(
      'Order status changed and it can no longer be cancelled',
    );

    expect(inventoryService.releaseStockInTransaction).toHaveBeenCalledTimes(1);
    expect(inventoryService.releaseStockInTransaction).toHaveBeenCalledWith(
      transactionClient,
      'variant-id',
      3,
      'order-id',
    );
  });

  it('rejects admin cancellation after Out for Delivery', async () => {
    const prisma = {
      order: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'order-id',
          currentStatus: OrderStatus.OUT_FOR_DELIVERY,
          deletedAt: null,
          items: [],
        }),
      },
      $transaction: jest.fn(),
    } as unknown as PrismaService;
    const service = new AdminOrdersService(
      prisma,
      {} as InventoryService,
      {} as NotificationsService,
    );

    await expect(service.cancel('order-id')).rejects.toThrow(
      'Cannot cancel an order after it is out for delivery',
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
