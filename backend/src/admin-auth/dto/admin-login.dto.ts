import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminLoginDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Admin email address',
    example: 'sarvaafresh@gmail.com',
  })
  email!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Admin password',
    example: 'Admin@123',
  })
  password!: string;
}
