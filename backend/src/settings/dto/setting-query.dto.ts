import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { SettingCategory } from '@prisma/client';

export class SettingQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value !== undefined ? Number(value) : value))
  @ApiProperty({ required: false, default: 1 })
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value !== undefined ? Number(value) : value))
  @ApiProperty({ required: false, default: 20 })
  limit?: number = 20;

  @IsOptional()
  @IsEnum(SettingCategory)
  @ApiProperty({ required: false, enum: SettingCategory })
  category?: SettingCategory;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @ApiProperty({ required: false })
  isPublic?: boolean;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  search?: string;
}
