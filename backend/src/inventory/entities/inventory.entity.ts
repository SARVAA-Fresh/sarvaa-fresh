import { ApiProperty } from '@nestjs/swagger';

export enum StockStatus {
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  LOW_STOCK = 'LOW_STOCK',
  IN_STOCK = 'IN_STOCK',
}

export class InventoryEntity {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Inventory UUID' })
  id!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef0987654321', description: 'Product Variant UUID' })
  variantId!: string;

  @ApiProperty({ example: 150, description: 'Available stock quantity' })
  availableStock!: number;

  @ApiProperty({ example: 10, description: 'Reserved stock quantity' })
  reservedStock!: number;

  @ApiProperty({ example: 5, description: 'Low stock threshold' })
  lowStockThreshold!: number;

  @ApiProperty({ example: true, description: 'Whether item is currently in stock' })
  isInStock!: boolean;

  @ApiProperty({ example: 'IN_STOCK', enum: StockStatus, description: 'Computed stock status' })
  stockStatus!: StockStatus;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Created at timestamp' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Updated at timestamp' })
  updatedAt!: Date;

  @ApiProperty({ example: null, description: 'Soft delete timestamp', nullable: true })
  deletedAt?: Date | null;
}
