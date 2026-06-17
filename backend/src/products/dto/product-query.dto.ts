import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsUUID,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ProductQueryDto {
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

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Search by product name', required: false })
  search?: string;

  @IsUUID()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Filter by category ID', required: false })
  categoryId?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }: { value: string | boolean }) => value === 'true' || value === true)
  @ApiPropertyOptional({ description: 'Filter by active status', required: false })
  isActive?: boolean;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt', required: false })
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc', required: false })
  sortOrder?: 'asc' | 'desc' = 'desc';
}