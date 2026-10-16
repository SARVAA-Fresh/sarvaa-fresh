import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { InventoryService } from '@/inventory/inventory.service';
import { NotificationTransport } from '@/notifications/notification-transport';
import { NotificationsService } from '@/notifications/notifications.service';
import { PrismaService } from '@/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
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
    const inventoryService = {} as InventoryService;
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
    expect(transport.dispatch).toHaveBeenCalledWith({
      type: 'customer.order_status_changed',
      orderId: 'order-id',
      orderNumber: 'ORD-123',
      customerId: 'customer-id',
      status: OrderStatus.CONFIRMED,
    });
  });
});
