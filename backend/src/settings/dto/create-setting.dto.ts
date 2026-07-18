import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SettingType, SettingCategory } from '@prisma/client';
import { MatchesSettingType } from '../validators/matches-setting-type.validator';

export class CreateSettingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9_.-]+$/)
  @ApiProperty({ example: 'business.name' })
  key!: string;

  @IsString()
  @MatchesSettingType()
  @ApiProperty({ example: 'Sarvaa Fresh' })
  value!: string;

  @IsEnum(SettingType)
  @ApiProperty({ enum: SettingType, example: SettingType.STRING })
  type!: SettingType;

  @IsEnum(SettingCategory)
  @ApiProperty({ enum: SettingCategory, example: SettingCategory.BUSINESS })
  category!: SettingCategory;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  @ApiProperty({ required: false })
  description?: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ required: false, default: true })
  isEditable?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ required: false, default: false })
  isPublic?: boolean;
}
