import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminJwtGuard } from '@/common/guards/admin-jwt.guard';

@ApiTags('Admin Dashboard')
@ApiBearerAuth('Bearer-auth')
@Controller('admin/dashboard')
@UseGuards(AdminJwtGuard)
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Get admin dashboard summary',
    description:
      'Returns aggregated dashboard metrics: active products, active categories, low-stock variants, today\'s order count and revenue, and order counts grouped by status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard summary returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin access required' })
  async getSummary() {
    return this.adminDashboardService.getSummary();
  }
}
