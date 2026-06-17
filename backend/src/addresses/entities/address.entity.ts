import { ApiProperty } from '@nestjs/swagger';

export class AddressEntity {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Address UUID' })
  id!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef0987654321', description: 'User UUID' })
  userId!: string;

  @ApiProperty({ example: 'Home', description: 'Address label' })
  label!: string;

  @ApiProperty({ example: 'Amit Sharma', description: 'Recipient full name' })
  fullName!: string;

  @ApiProperty({ example: '9876543210', description: 'Recipient mobile number' })
  mobile!: string;

  @ApiProperty({ example: 'B-402, Sunrise Apartments', description: 'Address line 1' })
  addressLine1!: string;

  @ApiProperty({ example: 'Near City Mall', description: 'Address line 2', nullable: true })
  addressLine2?: string | null;

  @ApiProperty({ example: 'Opposite Metro Station', description: 'Landmark', nullable: true })
  landmark?: string | null;

  @ApiProperty({ example: 'Koramangala', description: 'Area / locality' })
  area!: string;

  @ApiProperty({ example: 'Bangalore', description: 'City' })
  city!: string;

  @ApiProperty({ example: 'Karnataka', description: 'State' })
  state!: string;

  @ApiProperty({ example: '560034', description: '6-digit Indian pincode' })
  pincode!: string;

  @ApiProperty({ example: true, description: 'Whether this is the default address' })
  isDefault!: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Created at timestamp' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Updated at timestamp' })
  updatedAt!: Date;

  @ApiProperty({ example: null, description: 'Soft delete timestamp', nullable: true })
  deletedAt?: Date | null;
}
