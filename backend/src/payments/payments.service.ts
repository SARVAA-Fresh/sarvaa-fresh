import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { StorageService } from '@/storage/storage.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) {}

  private generateUpiUrl(orderNumber: string, amount: number): string {
    const upiId = this.configService.get<string>('UPI_ID', 'dummy@sarvaa');
    const upiName = this.configService.get<string>('UPI_NAME', 'SARVAA Fresh');
    const reference = encodeURIComponent(orderNumber);
    return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${amount.toFixed(2)}&cu=INR&tn=${reference}&tr=${reference}`;
  }

  private async assertOrderOwnership(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order || order.deletedAt) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('You can only access your own orders');
    }

    return order;
  }

  private mapPaymentResponse(
    payment: any,
    upiUrl?: string | null,
    qrCodeData?: string | null,
  ) {
    const statusMessage =
      payment.paymentStatus === 'PAYMENT_SUBMITTED'
        ? 'Payment submitted successfully. Verification is in progress.'
        : undefined;

    return {
      ...payment,
      amount: payment.amount.toString(),
      paymentUrl: upiUrl ?? null,
      qrCodeData: qrCodeData ?? null,
      statusMessage,
    };
  }

  async generatePayment(orderId: string, dto: CreatePaymentDto, userId: string) {
    const order = await this.assertOrderOwnership(orderId, userId);

    // Prevent duplicate active payments
    const existing = await this.prisma.payment.findFirst({
      where: { orderId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      return this.getPayment(orderId, userId);
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        paymentMethod: dto.paymentMethod,
        amount: order.totalAmount,
        paymentStatus: 'PENDING',
      },
    });

    if (dto.paymentMethod === 'UPI') {
      const amount = parseFloat(order.totalAmount.toString());
      const upiUrl = this.generateUpiUrl(order.orderNumber, amount);
      return this.mapPaymentResponse(payment, upiUrl, upiUrl);
    }

    return this.mapPaymentResponse(payment);
  }

  async submitPayment(orderId: string, userId: string) {
    const order = await this.assertOrderOwnership(orderId, userId);

    const payment = await this.prisma.payment.findFirst({
      where: { orderId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found for this order');
    }

    if (payment.paymentMethod !== 'UPI') {
      throw new BadRequestException(
        'Only UPI payments can be submitted',
      );
    }

    if (payment.paymentStatus !== 'PENDING') {
      throw new BadRequestException(
        `Payment status is already ${payment.paymentStatus}`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const nextPayment = await tx.payment.update({
        where: { id: payment.id },
        data: { paymentStatus: 'PAYMENT_SUBMITTED' },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: order.currentStatus,
          remarks: 'Payment Submitted',
        },
      });

      return nextPayment;
    });

    const amount = parseFloat(order.totalAmount.toString());
    const upiUrl = this.generateUpiUrl(order.orderNumber, amount);

    return this.mapPaymentResponse(updated, upiUrl, upiUrl);
  }

  async submitPaymentProof(
    orderId: string,
    userId: string,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Payment proof image is required');
    }

    const order = await this.assertOrderOwnership(orderId, userId);

    const payment = await this.prisma.payment.findFirst({
      where: { orderId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found for this order');
    }

    if (payment.paymentMethod !== 'UPI') {
      throw new BadRequestException('Only UPI payments can upload proof');
    }

    if (payment.paymentStatus === 'PAID' || payment.paymentStatus === 'FAILED') {
      throw new BadRequestException(
        `Cannot upload proof when payment status is ${payment.paymentStatus}`,
      );
    }

    const saved = await this.storageService.saveImage(file);

    const updated = await this.prisma.$transaction(async (tx) => {
      const nextPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          paymentProofUrl: saved.url,
          paymentStatus: 'PAYMENT_SUBMITTED',
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: order.currentStatus,
          remarks: 'Payment Submitted',
        },
      });

      return nextPayment;
    });

    const amount = parseFloat(order.totalAmount.toString());
    const upiUrl = this.generateUpiUrl(order.orderNumber, amount);

    return this.mapPaymentResponse(updated, upiUrl, upiUrl);
  }

  async getPayment(orderId: string, userId: string) {
    const order = await this.assertOrderOwnership(orderId, userId);

    const payment = await this.prisma.payment.findFirst({
      where: { orderId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found for this order');
    }

    let paymentUrl: string | null = null;
    let qrCodeData: string | null = null;

    if (payment.paymentMethod === 'UPI') {
      const amount = parseFloat(order.totalAmount.toString());
      paymentUrl = this.generateUpiUrl(order.orderNumber, amount);
      qrCodeData = paymentUrl;
    }

    return this.mapPaymentResponse(payment, paymentUrl, qrCodeData);
  }

  async markPaid(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order || order.deletedAt) {
      throw new NotFoundException('Order not found');
    }

    if (order.currentStatus === 'CANCELLED') {
      throw new BadRequestException(
        'Cannot mark payment as paid for a cancelled order',
      );
    }

    const payment = await this.prisma.payment.findFirst({
      where: { orderId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found for this order');
    }

    // State transition matrix
    const allowedTransitions: Record<string, string[]> = {
      PENDING: ['PAID', 'FAILED'],
      PAYMENT_SUBMITTED: ['PAID', 'FAILED'],
      PAID: [],
      FAILED: [],
    };

    if (!allowedTransitions[payment.paymentStatus]?.includes('PAID')) {
      throw new BadRequestException(
        `Cannot mark as paid from status ${payment.paymentStatus}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: { paymentStatus: 'PAID' },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'PAID' },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: order.currentStatus,
          remarks: 'Payment Verified',
        },
      });

      return this.mapPaymentResponse(updatedPayment);
    });
  }

  async markFailed(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order || order.deletedAt) {
      throw new NotFoundException('Order not found');
    }

    const payment = await this.prisma.payment.findFirst({
      where: { orderId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found for this order');
    }

    if (payment.paymentStatus !== 'PAYMENT_SUBMITTED') {
      throw new BadRequestException(
        `Cannot reject payment from status ${payment.paymentStatus}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: { paymentStatus: 'FAILED' },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'FAILED' },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: order.currentStatus,
          remarks: 'Payment Rejected',
        },
      });

      return this.mapPaymentResponse(updatedPayment);
    });
  }
}
