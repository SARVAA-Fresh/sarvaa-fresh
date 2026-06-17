import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateInventoryDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({ description: 'Low stock threshold', example: 5, minimum: 0 })
  lowStockThreshold?: number;
}
