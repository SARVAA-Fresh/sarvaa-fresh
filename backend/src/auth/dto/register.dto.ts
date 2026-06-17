import { IsString, IsNotEmpty, IsEmail, IsOptional, MinLength, MaxLength} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  fullName!: string;

  @ApiProperty({
    description: 'User mobile number',
    example: '9876543210',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(10)
  mobile!: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
    type: String,
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'User password (min 8 characters)',
    example: 'Password123!',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}