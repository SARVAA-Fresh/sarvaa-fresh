import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

export class PaymentEntity {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Payment UUID' })
  id!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef0987654321', description: 'Order UUID' })
  orderId!: string;

  @ApiProperty({ example: 'COD', enum: PaymentMethod, description: 'Payment method' })
  paymentMethod!: PaymentMethod;

  @ApiProperty({ example: 'PENDING', enum: PaymentStatus, description: 'Payment status' })
  paymentStatus!: PaymentStatus;

  @ApiProperty({ example: '300.00', description: 'Payment amount' })
  amount!: string;

  @ApiProperty({ example: null, description: 'Transaction reference', nullable: true })
  transactionReference?: string | null;

  @ApiProperty({ example: null, description: 'Payment proof URL', nullable: true })
  paymentProofUrl?: string | null;

  @ApiProperty({ example: null, description: 'UPI intent URL (UPI only)', nullable: true })
  paymentUrl?: string | null;

  @ApiProperty({ example: null, description: 'UPI QR code data string (UPI only)', nullable: true })
  qrCodeData?: string | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Created at timestamp' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Updated at timestamp' })
  updatedAt!: Date;

  @ApiProperty({ example: null, description: 'Soft delete timestamp', nullable: true })
  deletedAt?: Date | null;

  @ApiProperty({ example: 'Payment submitted successfully. Verification is in progress.', description: 'Customer-facing status message', required: false })
  statusMessage?: string;
}
