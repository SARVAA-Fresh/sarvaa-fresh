import { IsIn, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Public checkout supports Cash on Delivery only',
    enum: [PaymentMethod.COD],
    example: PaymentMethod.COD,
  })
  @IsIn([PaymentMethod.COD])
  @IsNotEmpty()
  paymentMethod!: PaymentMethod;
}
