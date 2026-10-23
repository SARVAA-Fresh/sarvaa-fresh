import 'reflect-metadata';
import { PaymentMethod } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { SettingsService } from '@/settings/settings.service';
import { PaymentsService } from './payments.service';

describe('PaymentsService public payment methods', () => {
  const order = {
    id: 'order-id',
    userId: 'customer-id',
    deletedAt: null,
    totalAmount: { toString: () => '25.00' },
  };

  it('creates COD payments when COD is enabled', async () => {
    const payment = {
      id: 'payment-id',
      orderId: 'order-id',
      paymentMethod: PaymentMethod.COD,
      amount: { toString: () => '25.00' },
      paymentStatus: 'PENDING',
    };
    const prisma = {
      order: { findUnique: jest.fn().mockResolvedValue(order) },
      payment: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(payment),
      },
    } as unknown as PrismaService;
    const settings = {
      findAllPublic: jest.fn().mockResolvedValue({
        payment: { codEnabled: true, upiEnabled: true },
      }),
    } as unknown as SettingsService;
    const service = new PaymentsService(prisma, settings);

    await expect(
      service.generatePayment(
        'order-id',
        { paymentMethod: PaymentMethod.COD },
        'customer-id',
      ),
    ).resolves.toMatchObject({
      paymentMethod: PaymentMethod.COD,
      paymentUrl: null,
      upiId: null,
    });
    expect(prisma.payment.create).toHaveBeenCalled();
  });

  it('rejects UPI even when legacy settings enable it', async () => {
    const prisma = {
      order: { findUnique: jest.fn().mockResolvedValue(order) },
      payment: { create: jest.fn() },
    } as unknown as PrismaService;
    const settings = {
      findAllPublic: jest.fn(),
    } as unknown as SettingsService;
    const service = new PaymentsService(prisma, settings);

    await expect(
      service.generatePayment(
        'order-id',
        { paymentMethod: PaymentMethod.UPI },
        'customer-id',
      ),
    ).rejects.toThrow('UPI payments are unavailable');
    expect(settings.findAllPublic).not.toHaveBeenCalled();
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('returns only a safe summary for historical UPI payments', async () => {
    const prisma = {
      order: { findUnique: jest.fn().mockResolvedValue(order) },
      payment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'payment-id',
          orderId: 'order-id',
          paymentMethod: PaymentMethod.UPI,
          amount: { toString: () => '25.00' },
          paymentStatus: 'PAYMENT_SUBMITTED',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
    } as unknown as PrismaService;
    const service = new PaymentsService(prisma, {} as SettingsService);

    const response = await service.getPayment('order-id', 'customer-id');
    expect(response).toMatchObject({
      paymentMethod: PaymentMethod.UPI,
      paymentStatus: 'PAYMENT_SUBMITTED',
      amount: '25.00',
      paymentUrl: null,
      qrCodeData: null,
      upiId: null,
      qrImageUrl: null,
    });
    expect(response).not.toHaveProperty('paymentProofUrl');
    expect(response).not.toHaveProperty('transactionReference');
    expect(prisma.payment.findFirst).toHaveBeenCalledWith({
      where: {
        orderId: 'order-id',
        deletedAt: null,
      },
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
  });
});
