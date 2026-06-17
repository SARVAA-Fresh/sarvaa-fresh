import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'User mobile number',
    example: '9876543210',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  mobile!: string;

  @ApiProperty({
    description: 'User password',
    example: 'Password123!',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  password!: string;
}