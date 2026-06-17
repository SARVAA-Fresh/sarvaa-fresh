import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateInventoryDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({ description: 'Available stock quantity', example: 150, minimum: 0 })
  availableStock?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({ description: 'Reserved stock quantity', example: 10, minimum: 0 })
  reservedStock?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({ description: 'Low stock threshold', example: 5, minimum: 0 })
  lowStockThreshold?: number;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Whether the item is currently in stock', example: true })
  isInStock?: boolean;
}
