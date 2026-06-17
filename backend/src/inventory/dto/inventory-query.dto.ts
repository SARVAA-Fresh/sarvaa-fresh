import { IsBoolean, IsInt, IsIn, IsOptional, IsString, IsUUID, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class InventoryQueryDto {
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

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }: { value: string | boolean }) => value === 'true' || value === true)
  @ApiPropertyOptional({ description: 'Filter by in-stock status', required: false })
  isInStock?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }: { value: string | boolean }) => value === 'true' || value === true)
  @ApiPropertyOptional({ description: 'Filter by low stock', required: false })
  isLowStock?: boolean;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt', required: false })
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc', required: false })
  sortOrder?: 'asc' | 'desc' = 'desc';
}
