import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationTransport } from '@/notifications/notification-transport';
import { NotificationsService } from '@/notifications/notifications.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

describe('OrdersService notification boundary', () => {
  it('does not notify when the Prisma transaction rejects', async () => {
    const failure = new Error('transaction failed');
    const transaction = jest.fn().mockRejectedValue(failure);
    const prisma = { $transaction: transaction } as unknown as PrismaService;
    const notifications = {
      notifyAdminOfOrderPlaced: jest.fn(),
    } as unknown as NotificationsService;
    const service = new OrdersService(prisma, notifications);

    await expect(
      service.create('customer-id', { addressId: 'address-id' } as CreateOrderDto),
    ).rejects.toBe(failure);

    expect(notifications.notifyAdminOfOrderPlaced).not.toHaveBeenCalled();
  });

  it('dispatches the admin event after commit and isolates transport failure', async () => {
    let committed = false;
    const order = {
      id: 'order-id',
      orderNumber: 'ORD-123',
      userId: 'customer-id',
      subtotal: new Prisma.Decimal(10),
      deliveryFee: new Prisma.Decimal(0),
      totalAmount: new Prisma.Decimal(10),
      items: [],
    };
    const transactionClient = {
      cart: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'cart-id',
          items: [
            {
              variantId: 'variant-id',
              quantity: 1,
              totalPrice: new Prisma.Decimal(10),
              variant: {
                price: new Prisma.Decimal(10),
                product: { name: 'Carrots' },
              },
            },
          ],
        }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      address: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'address-id',
          userId: 'customer-id',
          fullName: 'Customer',
          mobile: 'private-phone',
          addressLine1: 'Private address',
          addressLine2: null,
          landmark: null,
          area: 'Area',
          city: 'City',
          state: 'State',
          pincode: '000000',
        }),
      },
      inventory: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'inventory-id',
            variantId: 'variant-id',
            availableStock: 5,
            reservedStock: 0,
          },
        ]),
        update: jest.fn().mockResolvedValue(undefined),
      },
      order: {
        create: jest.fn().mockResolvedValue(order),
        findUnique: jest.fn().mockResolvedValue(order),
      },
      orderStatusHistory: { create: jest.fn().mockResolvedValue(undefined) },
      orderItem: { createMany: jest.fn().mockResolvedValue(undefined) },
      inventoryTransaction: { createMany: jest.fn().mockResolvedValue(undefined) },
      cartItem: { updateMany: jest.fn().mockResolvedValue(undefined) },
    };
    const transaction = jest.fn(async (callback: (tx: typeof transactionClient) => Promise<unknown>) => {
      const result = await callback(transactionClient);
      committed = true;
      return result;
    });
    const prisma = { $transaction: transaction } as unknown as PrismaService;
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
    const service = new OrdersService(prisma, notifications);

    await expect(
      service.create('customer-id', { addressId: 'address-id' } as CreateOrderDto),
    ).resolves.toEqual(order);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(transport.dispatch).toHaveBeenCalledWith({
      type: 'admin.order_placed',
      orderId: 'order-id',
      orderNumber: 'ORD-123',
    });
  });
});
