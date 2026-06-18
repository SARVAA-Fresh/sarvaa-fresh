import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { OrderItemEntity } from './order-item.entity';

export class OrderEntity {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Order UUID' })
  id!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef0987654321', description: 'User UUID' })
  userId!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1111111111', description: 'Address UUID' })
  addressId!: string;

  @ApiProperty({ example: 'ORD-1704067200000-1234', description: 'Unique order number' })
  orderNumber!: string;

  @ApiProperty({ example: '300.00', description: 'Order subtotal' })
  subtotal!: string;

  @ApiProperty({ example: '0.00', description: 'Delivery fee' })
  deliveryFee!: string;

  @ApiProperty({ example: '300.00', description: 'Total amount (subtotal + deliveryFee)' })
  totalAmount!: string;

  @ApiProperty({ example: 'PENDING', enum: OrderStatus, description: 'Current order status' })
  currentStatus!: OrderStatus;

  @ApiProperty({ example: 'PENDING', enum: ['PENDING', 'CONFIRMED', 'PACKING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'], description: 'Payment status' })
  paymentStatus!: string;

  @ApiProperty({ example: 'Leave at door', description: 'Order notes', nullable: true })
  notes?: string | null;

  @ApiProperty({ example: 'Amit Sharma', description: 'Delivery recipient name', nullable: true })
  deliveryName?: string | null;

  @ApiProperty({ example: '9876543210', description: 'Delivery phone', nullable: true })
  deliveryPhone?: string | null;

  @ApiProperty({ example: 'B-402, Sunrise Apartments, Near City Mall, Koramangala', description: 'Delivery address', nullable: true })
  deliveryAddress?: string | null;

  @ApiProperty({ example: 'Bangalore', description: 'Delivery city', nullable: true })
  deliveryCity?: string | null;

  @ApiProperty({ example: 'Karnataka', description: 'Delivery state', nullable: true })
  deliveryState?: string | null;

  @ApiProperty({ example: '560034', description: 'Delivery pincode', nullable: true })
  deliveryPincode?: string | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Created at timestamp' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Updated at timestamp' })
  updatedAt!: Date;

  @ApiProperty({ example: null, description: 'Soft delete timestamp', nullable: true })
  deletedAt?: Date | null;

  @ApiProperty({ type: [OrderItemEntity], description: 'Order items' })
  items?: OrderItemEntity[];
}
