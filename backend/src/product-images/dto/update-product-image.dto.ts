import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductImageDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  @ApiPropertyOptional({
    description: 'Alternative text for the image (max 500 characters)',
    maxLength: 500,
    required: false,
  })
  altText?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Display order for the image (lower numbers appear first)',
    minimum: 0,
    required: false,
  })
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Whether this image is the primary image for its product',
    required: false,
  })
  isPrimary?: boolean;
}
