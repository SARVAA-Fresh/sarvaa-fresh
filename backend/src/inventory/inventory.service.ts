import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma, Inventory, InventoryTransaction } from '@prisma/client';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { StockStatus } from './entities/inventory.entity';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private getStockStatus(inventory: {
    availableStock: number;
    lowStockThreshold: number;
  }): StockStatus {
    if (inventory.availableStock <= 0) return StockStatus.OUT_OF_STOCK;
    if (inventory.availableStock <= inventory.lowStockThreshold)
      return StockStatus.LOW_STOCK;
    return StockStatus.IN_STOCK;
  }

  private mapInventoryWithStatus(inventory: Inventory) {
    return {
      ...inventory,
      stockStatus: this.getStockStatus(inventory),
    };
  }

  async findAll(query: InventoryQueryDto): Promise<{
    items: Array<Inventory & { stockStatus: StockStatus; variant?: any }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.InventoryWhereInput = { deletedAt: null };
    if (query.variantId) where.variantId = query.variantId;
    if (query.isInStock !== undefined) where.isInStock = query.isInStock;

    // Fetch inventory with variant for productId filtering
    const rawItems = await this.prisma.inventory.findMany({
      where,
      include: { variant: true },
      orderBy: {
        [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc',
      },
    });

    let filtered = rawItems;

    if (query.productId) {
      filtered = filtered.filter((i) => i.variant.productId === query.productId);
    }

    if (query.isLowStock !== undefined) {
      filtered = filtered.filter(
        (i) =>
          i.availableStock > 0 &&
          i.availableStock <= i.lowStockThreshold === query.isLowStock,
      );
    }

    if (query.stockStatus) {
      filtered = filtered.filter(
        (i) => this.getStockStatus(i) === query.stockStatus,
      );
    }

    const total = filtered.length;
    const start = (page - 1) * limit;
    const items = filtered
      .slice(start, start + limit)
      .map((i) => this.mapInventoryWithStatus(i));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByVariantId(variantId: string): Promise<
    Inventory & { stockStatus: StockStatus; variant?: any }
  > {
    const inventory = await this.prisma.inventory.findUnique({
      where: { variantId },
      include: { variant: true },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory not found for this variant');
    }

    return this.mapInventoryWithStatus(inventory);
  }

  async update(
    variantId: string,
    dto: UpdateInventoryDto,
  ): Promise<Inventory & { stockStatus: StockStatus }> {
    try {
      const updated = await this.prisma.inventory.update({
        where: { variantId },
        data: {
          lowStockThreshold: dto.lowStockThreshold,
        },
      });
      return this.mapInventoryWithStatus(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Inventory not found for this variant');
      }
      throw error;
    }
  }

  async adjust(
    dto: AdjustInventoryDto,
  ): Promise<Inventory & { stockStatus: StockStatus }> {
    return this.prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({
        where: { variantId: dto.variantId },
      });

      if (!inventory) {
        throw new NotFoundException('Inventory not found for this variant');
      }

      let newAvailable = inventory.availableStock;
      let newReserved = inventory.reservedStock;
      let quantityChange = dto.quantity;

      switch (dto.type) {
        case 'IN':
        case 'PURCHASE':
        case 'RETURN':
          newAvailable += Math.abs(dto.quantity);
          quantityChange = Math.abs(dto.quantity);
          break;
        case 'OUT':
        case 'SALE':
        case 'DAMAGE':
          newAvailable -= Math.abs(dto.quantity);
          quantityChange = -Math.abs(dto.quantity);
          break;
        case 'RESERVE':
          newAvailable -= Math.abs(dto.quantity);
          newReserved += Math.abs(dto.quantity);
          quantityChange = -Math.abs(dto.quantity);
          break;
        case 'RELEASE':
          newAvailable += Math.abs(dto.quantity);
          newReserved -= Math.abs(dto.quantity);
          quantityChange = Math.abs(dto.quantity);
          break;
        case 'ADJUSTMENT':
          newAvailable += dto.quantity;
          quantityChange = dto.quantity;
          break;
      }

      if (newAvailable < 0) {
        throw new BadRequestException(
          'Cannot reduce available stock below zero',
        );
      }
      if (newReserved < 0) {
        throw new BadRequestException(
          'Cannot reduce reserved stock below zero',
        );
      }

      const updated = await tx.inventory.update({
        where: { variantId: dto.variantId },
        data: {
          availableStock: newAvailable,
          reservedStock: newReserved,
          isInStock: newAvailable > 0,
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          variantId: dto.variantId,
          inventoryId: inventory.id,
          type: dto.type,
          quantityChange,
          availableStockAfter: newAvailable,
          reservedStockAfter: newReserved,
          reason: dto.reason,
        },
      });

      return this.mapInventoryWithStatus(updated);
    });
  }

  async findTransactions(query: TransactionQueryDto): Promise<{
    items: InventoryTransaction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryTransactionWhereInput = {};
    if (query.variantId) where.variantId = query.variantId;
    if (query.inventoryId) where.inventoryId = query.inventoryId;
    if (query.type) where.type = query.type;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate)
        where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.inventoryTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc',
        },
      }),
      this.prisma.inventoryTransaction.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findTransactionById(id: string): Promise<InventoryTransaction> {
    const transaction = await this.prisma.inventoryTransaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  // ───────────────────────────────────────────────
  // Order Integration Methods
  // ───────────────────────────────────────────────

  async reserveStock(
    variantId: string,
    quantity: number,
    referenceId?: string,
  ): Promise<Inventory> {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be positive');
    }

    return this.prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({
        where: { variantId },
      });

      if (!inventory) {
        throw new NotFoundException('Inventory not found for this variant');
      }

      if (inventory.availableStock < quantity) {
        throw new BadRequestException('Insufficient available stock to reserve');
      }

      const newAvailable = inventory.availableStock - quantity;
      const newReserved = inventory.reservedStock + quantity;

      const updated = await tx.inventory.update({
        where: { variantId },
        data: {
          availableStock: newAvailable,
          reservedStock: newReserved,
          isInStock: newAvailable > 0,
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          variantId,
          inventoryId: inventory.id,
          type: 'RESERVE',
          quantityChange: -quantity,
          availableStockAfter: newAvailable,
          reservedStockAfter: newReserved,
          reason: 'Stock reserved for order',
          referenceId,
          referenceType: 'Order',
        },
      });

      return updated;
    });
  }

  async releaseStock(
    variantId: string,
    quantity: number,
    referenceId?: string,
  ): Promise<Inventory> {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be positive');
    }

    return this.prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({
        where: { variantId },
      });

      if (!inventory) {
        throw new NotFoundException('Inventory not found for this variant');
      }

      if (inventory.reservedStock < quantity) {
        throw new BadRequestException('Cannot release more than reserved stock');
      }

      const newAvailable = inventory.availableStock + quantity;
      const newReserved = inventory.reservedStock - quantity;

      const updated = await tx.inventory.update({
        where: { variantId },
        data: {
          availableStock: newAvailable,
          reservedStock: newReserved,
          isInStock: newAvailable > 0,
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          variantId,
          inventoryId: inventory.id,
          type: 'RELEASE',
          quantityChange: quantity,
          availableStockAfter: newAvailable,
          reservedStockAfter: newReserved,
          reason: 'Stock released from reservation',
          referenceId,
          referenceType: 'Order',
        },
      });

      return updated;
    });
  }

  async confirmStockDeduction(
    variantId: string,
    quantity: number,
    referenceId?: string,
  ): Promise<Inventory> {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be positive');
    }

    return this.prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({
        where: { variantId },
      });

      if (!inventory) {
        throw new NotFoundException('Inventory not found for this variant');
      }

      if (inventory.reservedStock < quantity) {
        throw new BadRequestException('Cannot confirm more than reserved stock');
      }

      const newReserved = inventory.reservedStock - quantity;

      const updated = await tx.inventory.update({
        where: { variantId },
        data: {
          reservedStock: newReserved,
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          variantId,
          inventoryId: inventory.id,
          type: 'SALE',
          quantityChange: -quantity,
          availableStockAfter: inventory.availableStock,
          reservedStockAfter: newReserved,
          reason: 'Stock confirmed for order',
          referenceId,
          referenceType: 'Order',
        },
      });

      return updated;
    });
  }
}
