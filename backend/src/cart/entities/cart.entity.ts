import { ApiProperty } from '@nestjs/swagger';
import { CartItemEntity } from './cart-item.entity';

export class CartEntity {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Cart UUID' })
  id!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef0987654321', description: 'User UUID' })
  userId!: string;

  @ApiProperty({ example: '300.00', description: 'Cart subtotal' })
  subtotal!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Created at timestamp' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Updated at timestamp' })
  updatedAt!: Date;

  @ApiProperty({ example: null, description: 'Soft delete timestamp', nullable: true })
  deletedAt?: Date | null;

  @ApiProperty({ type: [CartItemEntity], description: 'Cart items' })
  items?: CartItemEntity[];

  @ApiProperty({ example: 2, description: 'Total item count' })
  itemCount?: number;
}
