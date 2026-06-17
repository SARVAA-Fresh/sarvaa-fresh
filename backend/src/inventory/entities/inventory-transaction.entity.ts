import { ApiProperty } from '@nestjs/swagger';
import { InventoryTransactionType } from '@prisma/client';

export class InventoryTransactionEntity {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Transaction UUID' })
  id!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef0987654321', description: 'Product Variant UUID' })
  variantId!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1111111111', description: 'Inventory UUID' })
  inventoryId!: string;

  @ApiProperty({ example: 'IN', enum: InventoryTransactionType, description: 'Transaction type' })
  type!: InventoryTransactionType;

  @ApiProperty({ example: 10, description: 'Quantity changed' })
  quantityChange!: number;

  @ApiProperty({ example: 150, description: 'Available stock after transaction' })
  availableStockAfter!: number;

  @ApiProperty({ example: 0, description: 'Reserved stock after transaction' })
  reservedStockAfter!: number;

  @ApiProperty({ example: 'Initial stock load', description: 'Reason for adjustment', nullable: true })
  reason?: string | null;

  @ApiProperty({ example: 'order-123', description: 'Reference ID', nullable: true })
  referenceId?: string | null;

  @ApiProperty({ example: 'Order', description: 'Reference type', nullable: true })
  referenceType?: string | null;

  @ApiProperty({ example: null, description: 'Admin who performed the transaction', nullable: true })
  performedByAdminId?: string | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Created at timestamp' })
  createdAt!: Date;
}
