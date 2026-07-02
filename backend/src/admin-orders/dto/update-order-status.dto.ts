import { IsDefined, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @IsDefined()
  @IsEnum(OrderStatus)
  @ApiProperty({ description: 'New order status', enum: OrderStatus })
  status!: OrderStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiPropertyOptional({ description: 'Optional remarks for the status change', maxLength: 500, required: false })
  remarks?: string;
}