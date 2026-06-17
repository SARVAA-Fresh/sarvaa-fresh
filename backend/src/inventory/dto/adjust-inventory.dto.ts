import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { InventoryTransactionType } from '@prisma/client';

export class AdjustInventoryDto {
  @ApiProperty({
    description: 'Product Variant UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @IsNotEmpty()
  variantId!: string;

  @ApiProperty({
    description: 'Quantity to adjust (positive for IN/PURCHASE/RETURN/RELEASE, negative for OUT/SALE/DAMAGE/RESERVE)',
    example: 10,
  })
  @IsInt()
  @IsNotEmpty()
  quantity!: number;

  @ApiProperty({
    description: 'Transaction type',
    enum: InventoryTransactionType,
    example: 'IN',
  })
  @IsEnum(InventoryTransactionType)
  @IsNotEmpty()
  type!: InventoryTransactionType;

  @ApiProperty({
    description: 'Reason for the adjustment',
    example: 'Initial stock load',
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
