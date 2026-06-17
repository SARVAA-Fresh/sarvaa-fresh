import { IsEnum, IsInt, IsIn, IsOptional, IsString, IsUUID, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InventoryTransactionType } from '@prisma/client';

export class TransactionQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }: { value: string }) => Number(value))
  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }: { value: string }) => Number(value))
  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100, default: 20 })
  limit?: number = 20;

  @IsUUID()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Filter by product variant ID', required: false })
  variantId?: string;

  @IsUUID()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Filter by inventory ID', required: false })
  inventoryId?: string;

  @IsEnum(InventoryTransactionType)
  @IsOptional()
  @ApiPropertyOptional({ description: 'Filter by transaction type', enum: InventoryTransactionType, required: false })
  type?: InventoryTransactionType;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt', required: false })
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc', required: false })
  sortOrder?: 'asc' | 'desc' = 'desc';
}
