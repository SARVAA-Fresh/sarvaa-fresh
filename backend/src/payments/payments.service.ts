import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PaymentMethod, Prisma } from '@prisma/client';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { StorageService } from '@/storage/storage.service';
import { SettingsService } from '@/settings/settings.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly settingsService: SettingsService,
  ) {}

  private async paymentSettings() {
    const settings = await this.settingsService.findAllPublic();
    return settings.payment;
  }

  private generateUpiUrl(orderNumber: string, amount: number, upiId: string, upiName: string): string {
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
    paymentSettings?: Awaited<ReturnType<PaymentsService['paymentSettings']>>,
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
      merchantName: paymentSettings?.upiDisplayName ?? null,
      upiId: paymentSettings?.upiId ?? null,
      qrImageUrl: paymentSettings?.qrImageUrl ?? null,
      paymentInstructions: paymentSettings?.instructions ?? null,
      statusMessage,
    };
  }

  private async assertPaymentMethodEnabled(method: PaymentMethod) {
    const settings = await this.paymentSettings();
    if (method === PaymentMethod.COD && settings.codEnabled !== true) {
      throw new BadRequestException('Cash on Delivery is currently unavailable');
    }
    if (method === PaymentMethod.UPI) {
      if (settings.upiEnabled !== true) {
        throw new BadRequestException('UPI is currently unavailable');
      }
      if (!settings.upiId || !settings.upiDisplayName) {
        throw new BadRequestException('UPI payment settings are incomplete');
      }
    }
    return settings;
  }

  async generatePayment(orderId: string, dto: CreatePaymentDto, userId: string) {
    const order = await this.assertOrderOwnership(orderId, userId);
    const settings = await this.assertPaymentMethodEnabled(dto.paymentMethod);

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
      const upiUrl = this.generateUpiUrl(order.orderNumber, amount, settings.upiId!, settings.upiDisplayName!);
      return this.mapPaymentResponse(payment, upiUrl, upiUrl, settings);
    }

    return this.mapPaymentResponse(payment, null, null, settings);
  }

  async submitPayment(orderId: string, userId: string) {
    const order = await this.assertOrderOwnership(orderId, userId);
    const settings = await this.paymentSettings();

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
    const upiUrl = settings.upiId && settings.upiDisplayName
      ? this.generateUpiUrl(order.orderNumber, amount, settings.upiId, settings.upiDisplayName)
      : null;

    return this.mapPaymentResponse(updated, upiUrl, upiUrl, settings);
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
    const settings = await this.paymentSettings();

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
    const upiUrl = settings.upiId && settings.upiDisplayName
      ? this.generateUpiUrl(order.orderNumber, amount, settings.upiId, settings.upiDisplayName)
      : null;

    return this.mapPaymentResponse(updated, upiUrl, upiUrl, settings);
  }

  async getPayment(orderId: string, userId: string) {
    const order = await this.assertOrderOwnership(orderId, userId);
    const settings = await this.paymentSettings();

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
      paymentUrl = settings.upiId && settings.upiDisplayName
        ? this.generateUpiUrl(order.orderNumber, amount, settings.upiId, settings.upiDisplayName)
        : null;
      qrCodeData = paymentUrl;
    }

    return this.mapPaymentResponse(payment, paymentUrl, qrCodeData, settings);
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
        data: { paymentStatus: 'PAID', verifiedAt: new Date() },
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
        data: { paymentStatus: 'PENDING', paymentProofUrl: null },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'PENDING' },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: order.currentStatus,
          remarks: 'Payment proof rejected. Awaiting new payment proof.',
        },
      });

      return this.mapPaymentResponse(updatedPayment);
    });
  }
}
