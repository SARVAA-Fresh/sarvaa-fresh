import 'reflect-metadata';
import { SettingType } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { SettingsService } from './settings.service';

describe('SettingsService public payment settings', () => {
  it('advertises only COD and omits UPI configuration', async () => {
    const prisma = {
      setting: {
        findMany: jest.fn().mockResolvedValue([
          {
            key: 'payment.cod_enabled',
            value: 'true',
            type: SettingType.BOOLEAN,
          },
          {
            key: 'payment.upi_enabled',
            value: 'true',
            type: SettingType.BOOLEAN,
          },
          {
            key: 'payment.upi_id',
            value: 'merchant@example',
            type: SettingType.STRING,
          },
          {
            key: 'payment.qr_image_url',
            value: 'private-qr-path',
            type: SettingType.STRING,
          },
          {
            key: 'payment.instructions',
            value: 'Pay with UPI and upload proof',
            type: SettingType.STRING,
          },
        ]),
      },
    } as unknown as PrismaService;
    const service = new SettingsService(prisma);

    const result = await service.findAllPublic();

    expect(result.payment.availableMethods).toEqual(['COD']);
    expect(result.payment.codEnabled).toBe(true);
    expect(result.payment).not.toHaveProperty('upiId');
    expect(result.payment).not.toHaveProperty('qrImageUrl');
    expect(result.payment).not.toHaveProperty('instructions');
  });
});
