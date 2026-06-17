import { IsIn, IsInt, IsOptional, IsString, IsBoolean, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CategoryQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => Number(value))
  @ApiProperty({ required: false, default: 1 })
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => Number(value))
  @ApiProperty({ required: false, default: 20 })
  limit?: number = 20;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  search?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @ApiProperty({ required: false })
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false, default: 'createdAt' })
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  @ApiProperty({ required: false, default: 'desc' })
  sortOrder?: 'asc' | 'desc' = 'desc';
}