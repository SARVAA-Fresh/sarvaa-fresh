import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PaymentMethod, Prisma } from '@prisma/client';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { SettingsService } from '@/settings/settings.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  private async paymentSettings() {
    const settings = await this.settingsService.findAllPublic();
    return settings.payment;
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

  private mapPaymentResponse(payment: any, includeProof = false) {
    const safePayment = { ...payment };
    if (!includeProof) {
      delete safePayment.paymentProofUrl;
    }
    const statusMessage =
      payment.paymentStatus === 'PAYMENT_SUBMITTED'
        ? 'Payment submitted successfully. Verification is in progress.'
        : undefined;

    return {
      ...safePayment,
      amount: payment.amount.toString(),
      paymentUrl: null,
      qrCodeData: null,
      merchantName: null,
      upiId: null,
      qrImageUrl: null,
      paymentInstructions: null,
      statusMessage,
    };
  }

  private async assertPaymentMethodEnabled(method: PaymentMethod) {
    if (method === PaymentMethod.UPI) {
      throw new BadRequestException('UPI payments are unavailable');
    }

    const settings = await this.paymentSettings();
    if (method === PaymentMethod.COD && settings.codEnabled !== true) {
      throw new BadRequestException('Cash on Delivery is currently unavailable');
    }
    return settings;
  }

  async generatePayment(orderId: string, dto: CreatePaymentDto, userId: string) {
    const order = await this.assertOrderOwnership(orderId, userId);
    await this.assertPaymentMethodEnabled(dto.paymentMethod);

    // Prevent duplicate active payments
    const existing = await this.prisma.payment.findFirst({
      where: { orderId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      if (existing.paymentMethod !== PaymentMethod.COD) {
        throw new BadRequestException('Existing payment method is unavailable');
      }
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

    return this.mapPaymentResponse(payment);
  }

  async getPayment(orderId: string, userId: string) {
    await this.assertOrderOwnership(orderId, userId);

    const payment = await this.prisma.payment.findFirst({
      where: { orderId, deletedAt: null },
      select: {
        id: true,
        orderId: true,
        paymentMethod: true,
        amount: true,
        paymentStatus: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found for this order');
    }

    return this.mapPaymentResponse(payment);
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

      return this.mapPaymentResponse(updatedPayment, true);
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

      return this.mapPaymentResponse(updatedPayment, true);
    });
  }
}
