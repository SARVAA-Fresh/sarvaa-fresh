import { ApiProperty } from '@nestjs/swagger';

export class CartItemEntity {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Cart Item UUID' })
  id!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef0987654321', description: 'Cart UUID' })
  cartId!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1111111111', description: 'Product Variant UUID' })
  variantId!: string;

  @ApiProperty({ example: 2, description: 'Quantity' })
  quantity!: number;

  @ApiProperty({ example: '150.00', description: 'Unit price at time of addition' })
  unitPrice!: string;

  @ApiProperty({ example: '300.00', description: 'Total price (unitPrice × quantity)' })
  totalPrice!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Created at timestamp' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Updated at timestamp' })
  updatedAt!: Date;

  @ApiProperty({ example: null, description: 'Soft delete timestamp', nullable: true })
  deletedAt?: Date | null;
}
