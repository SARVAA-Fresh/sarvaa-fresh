import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsUrl,
  MaxLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateVariantInlineDto } from './create-variant-inline.dto';

export class CreateProductDto {
  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({ description: 'Category ID' })
  categoryId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @ApiProperty({ description: 'Product name', maxLength: 200 })
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Matches(/^[a-z0-9-]+$/)
  @ApiProperty({ description: 'URL-friendly slug', maxLength: 200 })
  slug!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  @ApiPropertyOptional({ description: 'Product description', maxLength: 2000, required: false })
  description?: string;

  @IsString()
  @IsOptional()
  @IsUrl()
  @ApiPropertyOptional({ description: 'Main product image URL', required: false })
  imageUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  @ApiPropertyOptional({ description: 'SEO meta title', maxLength: 200, required: false })
  metaTitle?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  @ApiPropertyOptional({ description: 'SEO meta description', maxLength: 500, required: false })
  metaDescription?: string;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Whether product is active', required: false })
  isActive?: boolean;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantInlineDto)
  @ApiPropertyOptional({ description: 'Inline variants to create with the product', required: false, type: () => CreateVariantInlineDto })
  variants?: CreateVariantInlineDto[];
}