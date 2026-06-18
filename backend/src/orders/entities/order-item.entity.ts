import { ApiProperty } from '@nestjs/swagger';

export class OrderItemEntity {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Order Item UUID' })
  id!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef0987654321', description: 'Order UUID' })
  orderId!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1111111111', description: 'Product Variant UUID' })
  variantId!: string;

  @ApiProperty({ example: 'Fresh Organic Apples', description: 'Product name snapshot at order time' })
  productNameSnapshot!: string;

  @ApiProperty({ example: '150.00', description: 'Unit price at order time' })
  unitPrice!: string;

  @ApiProperty({ example: 2, description: 'Quantity ordered' })
  quantity!: number;

  @ApiProperty({ example: '300.00', description: 'Total price' })
  totalPrice!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Created at timestamp' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Updated at timestamp' })
  updatedAt!: Date;
}
