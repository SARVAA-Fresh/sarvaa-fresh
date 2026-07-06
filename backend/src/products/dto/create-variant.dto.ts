import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVariantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @ApiProperty({ description: 'SKU code', maxLength: 100 })
  sku!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @ApiProperty({ description: 'Variant name', maxLength: 100 })
  variantName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @ApiProperty({ description: 'Unit of measurement', maxLength: 50 })
  unit!: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  @ApiPropertyOptional({ description: 'Weight value', minimum: 0, required: false })
  weight?: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Type(() => Number)
  @ApiProperty({ description: 'Price', minimum: 0 })
  price!: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  @ApiPropertyOptional({ description: 'Maximum retail price', minimum: 0, required: false })
  mrp?: number;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Is default variant', required: false })
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Is active', required: false })
  isActive?: boolean;
}