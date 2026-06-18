import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';

export class VerifyPaymentDto {
  @ApiPropertyOptional({
    description: 'Payment status to verify',
    enum: PaymentStatus,
    example: 'PAID',
  })
  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;
}
