import { IsString, IsNotEmpty, IsOptional, IsBoolean, Length, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty({
    description: 'Label for the address (e.g., Home, Office)',
    example: 'Home',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  label!: string;

  @ApiProperty({
    description: 'Full name of the recipient',
    example: 'Amit Sharma',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName!: string;

  @ApiProperty({
    description: 'Indian mobile number (10 digits)',
    example: '9876543210',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @Length(10, 10)
  @Matches(/^[6-9]\d{9}$/, { message: 'Mobile number must be a valid 10-digit Indian mobile number' })
  mobile!: string;

  @ApiProperty({
    description: 'Address line 1 (street, house number, etc.)',
    example: 'B-402, Sunrise Apartments',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  addressLine1!: string;

  @ApiProperty({
    description: 'Address line 2 (optional)',
    example: 'Near City Mall',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  addressLine2?: string;

  @ApiProperty({
    description: 'Landmark (optional)',
    example: 'Opposite Metro Station',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  landmark?: string;

  @ApiProperty({
    description: 'Area / locality',
    example: 'Koramangala',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  area!: string;

  @ApiProperty({
    description: 'City',
    example: 'Bangalore',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;

  @ApiProperty({
    description: 'State',
    example: 'Karnataka',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  state!: string;

  @ApiProperty({
    description: 'Indian pincode (6 digits)',
    example: '560034',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'Pincode must be a valid 6-digit Indian pincode' })
  pincode!: string;

  @ApiProperty({
    description: 'Whether this is the default address for the user',
    example: false,
    type: Boolean,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
