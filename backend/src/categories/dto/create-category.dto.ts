import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @ApiProperty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/)
  @ApiProperty()
  slug!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  @ApiProperty({ required: false })
  description?: string;

  @IsString()
  @IsOptional()
  @IsUrl()
  @ApiProperty({ required: false })
  imageUrl?: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ required: false })
  isActive?: boolean;
}