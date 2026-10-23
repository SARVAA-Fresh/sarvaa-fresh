import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, Prisma } from '@prisma/client';
import { InventoryService } from '@/inventory/inventory.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationTransport } from '@/notifications/notification-transport';
import { NotificationsService } from '@/notifications/notifications.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

describe('OrdersService notification boundary', () => {
  it('returns a safe legacy UPI payment summary on customer order reads', async () => {
    const legacyOrder = {
      id: 'order-id',
      userId: 'customer-id',
      deletedAt: null,
      payments: [
        {
          id: 'payment-id',
          paymentMethod: 'UPI',
          amount: new Prisma.Decimal(25),
          paymentStatus: 'PAYMENT_SUBMITTED',
        },
      ],
    };
    const prisma = {
      order: {
        findUnique: jest.fn().mockResolvedValue(legacyOrder),
      },
    } as unknown as PrismaService;
    const service = new OrdersService(
      prisma,
      {} as InventoryService,
      {} as NotificationsService,
    );

    await expect(service.findById('customer-id', 'order-id')).resolves.toBe(
      legacyOrder,
    );
    expect(prisma.order.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          payments: {
            select: {
              id: true,
              orderId: true,
              paymentMethod: true,
              amount: true,
              paymentStatus: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        }),
      }),
    );
  });

  it('rejects a stale multi-item cart when the atomic stock check fails', async () => {
    const cart = {
      id: 'cart-id',
      items: [
        {
          variantId: 'variant-1',
          quantity: 1,
          totalPrice: new Prisma.Decimal(10),
          variant: { price: new Prisma.Decimal(10), product: { name: 'Carrots' } },
        },
        {
          variantId: 'variant-2',
          quantity: 4,
          totalPrice: new Prisma.Decimal(20),
          variant: { price: new Prisma.Decimal(5), product: { name: 'Potatoes' } },
        },
      ],
    };
    const stock = new Map([
      ['variant-1', { availableStock: 5, reservedStock: 0 }],
      ['variant-2', { availableStock: 2, reservedStock: 0 }],
    ]);
    const transactionClient = {
      cart: { findUnique: jest.fn().mockResolvedValue(cart) },
      address: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'address-id',
          userId: 'customer-id',
          deletedAt: null,
        }),
      },
      inventory: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'inventory-1', variantId: 'variant-1', availableStock: 5, reservedStock: 0 },
          { id: 'inventory-2', variantId: 'variant-2', availableStock: 2, reservedStock: 0 },
        ]),
        update: jest.fn(),
      },
      order: { create: jest.fn() },
    };
    const transaction = jest.fn(async (
      callback: (tx: typeof transactionClient) => Promise<unknown>,
    ) => {
      const transactionStock = new Map(
        [...stock.entries()].map(([variantId, value]) => [variantId, { ...value }]),
      );
      transactionClient.inventory.update.mockImplementation(async (args: {
        where: { id: string; availableStock: { gte: number } };
        data: {
          availableStock: { decrement: number };
          reservedStock: { increment: number };
        };
      }) => {
        const variantId = args.where.id === 'inventory-1' ? 'variant-1' : 'variant-2';
        const inventoryStock = transactionStock.get(variantId)!;
        if (inventoryStock.availableStock < args.where.availableStock.gte) {
          throw new Prisma.PrismaClientKnownRequestError(
            'Insufficient stock',
            { code: 'P2025', clientVersion: '5.22.0' },
          );
        }
        inventoryStock.availableStock -= args.data.availableStock.decrement;
        inventoryStock.reservedStock += args.data.reservedStock.increment;
        return { ...inventoryStock };
      });

      const result = await callback(transactionClient);
      for (const [variantId, value] of transactionStock) {
        stock.set(variantId, value);
      }
      return result;
    });
    const notifications = {
      notifyAdminOfOrderPlaced: jest.fn(),
    } as unknown as NotificationsService;
    const service = new OrdersService(
      { $transaction: transaction } as unknown as PrismaService,
      {} as InventoryService,
      notifications,
    );

    await expect(
      service.create('customer-id', { addressId: 'address-id' } as CreateOrderDto),
    ).rejects.toThrow('Insufficient stock for Potatoes');

    expect(transactionClient.inventory.update).toHaveBeenCalledTimes(2);
    expect(transactionClient.inventory.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          availableStock: { gte: 4 },
        }),
      }),
    );
    expect(transactionClient.order.create).not.toHaveBeenCalled();
    expect(notifications.notifyAdminOfOrderPlaced).not.toHaveBeenCalled();
    expect(stock.get('variant-1')).toEqual({ availableStock: 5, reservedStock: 0 });
  });

  it('does not let simultaneous orders reserve more than the available stock', async () => {
    const cart = {
      id: 'cart-id',
      items: [
        {
          variantId: 'variant-id',
          quantity: 4,
          totalPrice: new Prisma.Decimal(40),
          variant: {
            price: new Prisma.Decimal(10),
            product: { name: 'Carrots' },
          },
        },
      ],
    };
    const stock = { availableStock: 5, reservedStock: 0 };
    const createdOrders = new Map<
      string,
      { id: string; orderNumber: string; userId: string; items: unknown[] }
    >();
    let orderNumber = 0;
    const transactionClient = {
      cart: {
        findUnique: jest.fn().mockResolvedValue(cart),
        update: jest.fn().mockResolvedValue(undefined),
      },
      address: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'address-id',
          userId: 'customer-id',
          deletedAt: null,
          fullName: 'Customer',
          mobile: '0000000000',
          addressLine1: 'Address',
          addressLine2: null,
          landmark: null,
          area: 'Area',
          city: 'City',
          state: 'State',
          pincode: '000000',
        }),
      },
      inventory: {
        findMany: jest.fn(async () => [
          {
            id: 'inventory-id',
            variantId: 'variant-id',
            availableStock: stock.availableStock,
            reservedStock: stock.reservedStock,
          },
        ]),
        update: jest.fn(async (args: {
          where: { availableStock: { gte: number } };
          data: { availableStock: { decrement: number }; reservedStock: { increment: number } };
        }) => {
          if (stock.availableStock < args.where.availableStock.gte) {
            throw new Prisma.PrismaClientKnownRequestError(
              'Insufficient stock',
              { code: 'P2025', clientVersion: '5.22.0' },
            );
          }
          stock.availableStock -= args.data.availableStock.decrement;
          stock.reservedStock += args.data.reservedStock.increment;
          return { ...stock };
        }),
      },
      order: {
        create: jest.fn(async () => {
          orderNumber += 1;
          const order = {
            id: `order-${orderNumber}`,
            orderNumber: `ORD-${orderNumber}`,
            userId: 'customer-id',
            items: [],
          };
          createdOrders.set(order.id, order);
          return order;
        }),
        findUnique: jest.fn(async ({ where }: { where: { id: string } }) =>
          createdOrders.get(where.id) ?? null,
        ),
      },
      orderStatusHistory: { create: jest.fn().mockResolvedValue(undefined) },
      orderItem: { createMany: jest.fn().mockResolvedValue(undefined) },
      inventoryTransaction: { createMany: jest.fn().mockResolvedValue(undefined) },
      cartItem: { updateMany: jest.fn().mockResolvedValue(undefined) },
    };
    const prisma = {
      $transaction: jest.fn(
        (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
          callback(transactionClient),
      ),
    } as unknown as PrismaService;
    const service = new OrdersService(
      prisma,
      {} as InventoryService,
      { notifyAdminOfOrderPlaced: jest.fn() } as unknown as NotificationsService,
    );

    const results = await Promise.allSettled([
      service.create('customer-id', { addressId: 'address-id' } as CreateOrderDto),
      service.create('customer-id', { addressId: 'address-id' } as CreateOrderDto),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(stock).toEqual({ availableStock: 1, reservedStock: 4 });
  });

  it('does not notify when the Prisma transaction rejects', async () => {
    const failure = new Error('transaction failed');
    const transaction = jest.fn().mockRejectedValue(failure);
    const prisma = { $transaction: transaction } as unknown as PrismaService;
    const notifications = {
      notifyAdminOfOrderPlaced: jest.fn(),
    } as unknown as NotificationsService;
    const service = new OrdersService(prisma, {} as InventoryService, notifications);

    await expect(
      service.create('customer-id', { addressId: 'address-id' } as CreateOrderDto),
    ).rejects.toBe(failure);

    expect(notifications.notifyAdminOfOrderPlaced).not.toHaveBeenCalled();
  });

  it('releases a customer cancellation once and rejects a racing duplicate', async () => {
    const order = {
      id: 'order-id',
      userId: 'customer-id',
      currentStatus: OrderStatus.PENDING,
      deletedAt: null,
      items: [{ variantId: 'variant-id', quantity: 2 }],
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
    const inventoryService = {
      releaseStockInTransaction: jest.fn().mockResolvedValue(undefined),
    } as unknown as InventoryService;
    const service = new OrdersService(
      {
        order: { findUnique: jest.fn().mockResolvedValue(order) },
        $transaction: transaction,
      } as unknown as PrismaService,
      inventoryService,
      {} as NotificationsService,
    );

    await expect(service.cancel('customer-id', 'order-id')).resolves.toMatchObject({
      currentStatus: OrderStatus.CANCELLED,
    });
    await expect(service.cancel('customer-id', 'order-id')).rejects.toThrow(
      'Order status changed and it can no longer be cancelled',
    );

    expect(inventoryService.releaseStockInTransaction).toHaveBeenCalledTimes(1);
    expect(inventoryService.releaseStockInTransaction).toHaveBeenCalledWith(
      transactionClient,
      'variant-id',
      2,
      'order-id',
    );
  });

  it('rejects customer cancellation after Out for Delivery', async () => {
    const prisma = {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'order-id',
          userId: 'customer-id',
          currentStatus: OrderStatus.OUT_FOR_DELIVERY,
          deletedAt: null,
          items: [],
        }),
      },
      $transaction: jest.fn(),
    } as unknown as PrismaService;
    const service = new OrdersService(prisma, {} as InventoryService, {} as NotificationsService);

    await expect(service.cancel('customer-id', 'order-id')).rejects.toThrow(
      'Order can only be cancelled before it is out for delivery',
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
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
    const service = new OrdersService(prisma, {} as InventoryService, notifications);

    await expect(
      service.create('customer-id', { addressId: 'address-id' } as CreateOrderDto),
    ).resolves.toEqual(order);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(transactionClient.inventory.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'inventory-id',
          availableStock: { gte: 1 },
          deletedAt: null,
        },
        data: {
          availableStock: { decrement: 1 },
          reservedStock: { increment: 1 },
          isInStock: true,
        },
      }),
    );
    expect(transport.dispatch).toHaveBeenCalledWith({
      type: 'admin.order_placed',
      orderId: 'order-id',
      orderNumber: 'ORD-123',
    });
  });
});
