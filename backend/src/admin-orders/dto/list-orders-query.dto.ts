import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { PaymentStatus } from '@prisma/client';

export class ListOrdersQueryDto {
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

  @IsEnum(OrderStatus)
  @IsOptional()
  @ApiPropertyOptional({ description: 'Filter by order status', enum: OrderStatus, required: false })
  status?: OrderStatus;

  @IsEnum(PaymentStatus)
  @IsOptional()
  @ApiPropertyOptional({ description: 'Filter by payment status', enum: PaymentStatus, required: false })
  paymentStatus?: PaymentStatus;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Filter by customer mobile number (partial match)', required: false })
  customerMobile?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Filter by order number (partial match)', required: false })
  orderNumber?: string;
}