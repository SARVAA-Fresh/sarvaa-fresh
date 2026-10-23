import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiSecurity,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentEntity } from './entities/payment.entity';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { AdminApiKeyGuard } from '@/common/guards/admin-api-key.guard';
import { AdminJwtGuard } from '@/common/guards/admin-jwt.guard';
import { CurrentUser, CurrentUserPayload } from '@/common/decorators/current-user.decorator';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('Bearer-auth')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('order/:orderId')
  @ApiOperation({
    summary: 'Generate payment for order',
    description:
      'Create a Cash on Delivery payment record for the order. Public checkout supports COD only; UPI is unavailable.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'Order UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment generated successfully',
    type: PaymentEntity,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not your order' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async generatePayment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: CreatePaymentDto,
  ): Promise<PaymentEntity> {
    return this.paymentsService.generatePayment(orderId, dto, user.userId) as any;
  }

  @Get('order/:orderId')
  @ApiOperation({
    summary: 'Get payment details',
    description:
      'Retrieve Cash on Delivery payment details for the order. Only the order owner can access it.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'Order UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment details returned successfully',
    type: PaymentEntity,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not your order' })
  @ApiResponse({ status: 404, description: 'Payment or order not found' })
  async getPayment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<PaymentEntity> {
    return this.paymentsService.getPayment(orderId, user.userId) as any;
  }

  @Patch('order/:orderId/mark-paid')
  @UseGuards(AdminApiKeyGuard)
  @ApiSecurity('Api-key-auth')
  @ApiOperation({
    summary: 'Mark payment as paid (admin only)',
    description:
      'Manually mark a payment as PAID. Requires x-api-key header. Also updates order paymentStatus. Validates order is not cancelled and payment is in an allowed state (PENDING or PAYMENT_SUBMITTED).',
  })
  @ApiParam({
    name: 'orderId',
    description: 'Order UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment marked as paid',
    type: PaymentEntity,
  })
  @ApiResponse({ status: 400, description: 'Order is cancelled or payment status does not allow marking as paid' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — invalid or missing admin API key' })
  @ApiResponse({ status: 404, description: 'Payment or order not found' })
  async markPaid(
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<PaymentEntity> {
    return this.paymentsService.markPaid(orderId) as any;
  }
}

@ApiTags('Admin Payments')
@Controller('admin/payments')
@UseGuards(AdminJwtGuard)
@ApiBearerAuth('Bearer-auth')
export class AdminPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Patch('order/:orderId/mark-paid')
  @ApiOperation({
    summary: 'Mark payment as paid (admin JWT)',
    description:
      'Admin action for COD pending payments and submitted UPI payments. Updates both Payment.paymentStatus and Order.paymentStatus.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'Order UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment marked as paid',
    type: PaymentEntity,
  })
  @ApiResponse({ status: 400, description: 'Invalid payment transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Payment or order not found' })
  async markPaid(
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<PaymentEntity> {
    return this.paymentsService.markPaid(orderId) as any;
  }

  @Patch('order/:orderId/reject')
  @ApiOperation({
    summary: 'Reject submitted payment (admin JWT)',
    description:
      'Admin action for submitted UPI payments. Marks the payment and order payment status as FAILED.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'Order UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment rejected',
    type: PaymentEntity,
  })
  @ApiResponse({ status: 400, description: 'Invalid payment transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Payment or order not found' })
  async reject(
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<PaymentEntity> {
    return this.paymentsService.markFailed(orderId) as any;
  }
}
