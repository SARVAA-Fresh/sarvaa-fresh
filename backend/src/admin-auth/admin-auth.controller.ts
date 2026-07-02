import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminJwtGuard } from '@/common/guards/admin-jwt.guard';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('Admin Authentication')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin login',
    description: 'Authenticate admin and return JWT token',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        admin: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            fullName: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', example: 'SUPER_ADMIN' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: AdminLoginDto) {
    return this.adminAuthService.login(dto);
  }

  @Get('me')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth('Bearer-auth')
  @ApiOperation({
    summary: 'Get current admin profile',
    description: 'Get profile of authenticated admin',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin profile returned successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        fullName: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() admin: { adminId: string; email: string; role: string }) {
    return this.adminAuthService.getProfile(admin.adminId);
  }
}
