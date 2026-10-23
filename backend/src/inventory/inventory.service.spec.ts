import 'reflect-metadata';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { InventoryService } from './inventory.service';

const reservationConflict = () =>
  new Prisma.PrismaClientKnownRequestError('Reservation is no longer available', {
    code: 'P2025',
    clientVersion: '5.22.0',
  });

describe('InventoryService order stock operations', () => {
  it('releases a reservation with an atomic reserved-stock guard', async () => {
    const before = {
      id: 'inventory-id',
      variantId: 'variant-id',
      availableStock: 0,
      reservedStock: 3,
      deletedAt: null,
    };
    const after = { ...before, availableStock: 3, reservedStock: 0, isInStock: true };
    const transactionClient = {
      inventory: {
        findFirst: jest.fn().mockResolvedValue(before),
        update: jest.fn().mockResolvedValue(after),
      },
      inventoryTransaction: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    };
    const service = new InventoryService({} as PrismaService);

    await expect(
      service.releaseStockInTransaction(
        transactionClient as never,
        'variant-id',
        3,
        'order-id',
      ),
    ).resolves.toEqual(after);

    expect(transactionClient.inventory.update).toHaveBeenCalledWith({
      where: {
        variantId: 'variant-id',
        reservedStock: { gte: 3 },
        deletedAt: null,
      },
      data: {
        availableStock: { increment: 3 },
        reservedStock: { decrement: 3 },
        isInStock: true,
      },
    });
    expect(after.isInStock).toBe(after.availableStock > 0);
    expect(transactionClient.inventoryTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'RELEASE',
        availableStockAfter: 3,
        reservedStockAfter: 0,
        referenceId: 'order-id',
      }),
    });
  });

  it('does not release more stock than remains reserved', async () => {
    const transactionClient = {
      inventory: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'inventory-id',
          variantId: 'variant-id',
          availableStock: 4,
          reservedStock: 2,
          deletedAt: null,
        }),
        update: jest.fn().mockRejectedValue(reservationConflict()),
      },
      inventoryTransaction: { create: jest.fn() },
    };
    const service = new InventoryService({} as PrismaService);

    await expect(
      service.releaseStockInTransaction(
        transactionClient as never,
        'variant-id',
        3,
        'order-id',
      ),
    ).rejects.toThrow('Cannot release more than reserved stock');
    expect(transactionClient.inventoryTransaction.create).not.toHaveBeenCalled();
  });

  it('deducts delivered stock within the caller transaction and only once', async () => {
    const before = {
      id: 'inventory-id',
      variantId: 'variant-id',
      availableStock: 2,
      reservedStock: 3,
      deletedAt: null,
    };
    const after = { ...before, reservedStock: 0 };
    const transactionClient = {
      inventory: {
        findFirst: jest.fn().mockResolvedValue(before),
        update: jest.fn()
          .mockResolvedValueOnce(after)
          .mockRejectedValueOnce(reservationConflict()),
      },
      inventoryTransaction: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    };
    const service = new InventoryService({} as PrismaService);

    await expect(
      service.confirmStockDeductionInTransaction(
        transactionClient as never,
        'variant-id',
        3,
        'order-id',
      ),
    ).resolves.toEqual(after);
    await expect(
      service.confirmStockDeductionInTransaction(
        transactionClient as never,
        'variant-id',
        3,
        'order-id',
      ),
    ).rejects.toThrow('Cannot confirm more than reserved stock');

    expect(transactionClient.inventory.update).toHaveBeenNthCalledWith(1, {
      where: {
        variantId: 'variant-id',
        reservedStock: { gte: 3 },
        deletedAt: null,
      },
      data: { reservedStock: { decrement: 3 } },
    });
    expect(transactionClient.inventoryTransaction.create).toHaveBeenCalledTimes(1);
  });
});
