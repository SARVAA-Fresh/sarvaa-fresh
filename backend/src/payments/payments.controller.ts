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
      'Create a payment record for an order. For COD, returns basic details. For UPI, generates a UPI intent URL and QR code data string. Only the order owner can generate payment. Prevents duplicate active payments.',
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

  @Patch('order/:orderId/submit')
  @ApiOperation({
    summary: 'Submit UPI payment',
    description:
      'Customer submits a UPI payment. Moves payment status from PENDING to PAYMENT_SUBMITTED. Only UPI payments and only the order owner can submit.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'Order UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment submitted successfully. Verification is in progress.',
    type: PaymentEntity,
  })
  @ApiResponse({ status: 400, description: 'Not a UPI payment or status is not PENDING' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not your order' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async submitPayment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<PaymentEntity> {
    return this.paymentsService.submitPayment(orderId, user.userId) as any;
  }

  @Get('order/:orderId')
  @ApiOperation({
    summary: 'Get payment details',
    description:
      'Retrieve payment details for an order. For UPI payments, the UPI intent URL and QR data are regenerated on each request. Only the order owner can access.',
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
