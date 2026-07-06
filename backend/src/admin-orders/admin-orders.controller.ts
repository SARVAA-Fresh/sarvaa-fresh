import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AdminOrdersService } from './admin-orders.service';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AdminJwtGuard } from '@/common/guards/admin-jwt.guard';

@ApiTags('Admin Orders')
@Controller('admin/orders')
@UseGuards(AdminJwtGuard)
@ApiBearerAuth('Bearer-auth')
export class AdminOrdersController {
  constructor(private readonly adminOrdersService: AdminOrdersService) {}

  @Get()
  @ApiOperation({
    summary: 'List all orders',
    description:
      'Returns a paginated list of orders with optional filters by status, payment status, customer mobile, and order number.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated order list returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin access required' })
  async findAll(@Query() query: ListOrdersQueryDto) {
    return this.adminOrdersService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get order statistics',
    description:
      'Returns aggregate order counts by status and today\'s order count and revenue.',
  })
  @ApiResponse({
    status: 200,
    description: 'Order statistics returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin access required' })
  async getStats() {
    return this.adminOrdersService.getStats();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get order by ID',
    description:
      'Returns full order details including items, user info, payments, and status history.',
  })
  @ApiParam({
    name: 'id',
    description: 'Order UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Order returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin access required' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminOrdersService.findById(id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update order status',
    description:
      'Updates the order status following the valid state transition matrix. When status changes to DELIVERED, stock is confirmed.',
  })
  @ApiParam({
    name: 'id',
    description: 'Order UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Order status updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin access required' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.adminOrdersService.updateStatus(id, dto);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancel an order',
    description:
      'Cancels the order and releases reserved stock back to available inventory. Cannot cancel a DELIVERED order.',
  })
  @ApiParam({
    name: 'id',
    description: 'Order UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Order cancelled successfully',
  })
  @ApiResponse({ status: 400, description: 'Order is already cancelled or delivered' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin access required' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminOrdersService.cancel(id);
  }
}