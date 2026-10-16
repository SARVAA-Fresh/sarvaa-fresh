import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '@prisma/client';
import {
  NotificationTransport,
  OrderNotification,
} from './notification-transport';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let transport: jest.Mocked<NotificationTransport>;
  let enabled: string | undefined;

  beforeEach(() => {
    enabled = undefined;
    transport = {
      dispatch: jest.fn().mockResolvedValue(undefined),
    };

    const config = {
      get: jest.fn(() => enabled),
    } as unknown as ConfigService;

    service = new NotificationsService(config, transport);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not dispatch when notifications are disabled by default', async () => {
    await service.notifyAdminOfOrderPlaced('order-id', 'ORD-123');
    await service.notifyCustomerOfOrderStatus(
      'order-id',
      'ORD-123',
      'customer-id',
      OrderStatus.CONFIRMED,
    );

    expect(transport.dispatch).not.toHaveBeenCalled();
  });

  it('isolates transport failures without logging notification payloads', async () => {
    enabled = 'true';
    const failure = new Error('sensitive transport failure');
    transport.dispatch.mockRejectedValue(failure);
    const warning = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const event: OrderNotification = {
      type: 'customer.order_status_changed',
      orderId: 'order-id',
      orderNumber: 'ORD-123',
      customerId: 'customer-id',
      status: OrderStatus.CONFIRMED,
    };

    await expect(
      service.notifyCustomerOfOrderStatus(
        event.orderId,
        event.orderNumber,
        event.customerId,
        event.status,
      ),
    ).resolves.toBeUndefined();

    expect(warning).toHaveBeenCalledWith(
      'Notification dispatch failed for event customer.order_status_changed',
    );
    expect(warning.mock.calls.flat().join(' ')).not.toContain(failure.message);
  });

  it('isolates synchronous transport errors', async () => {
    enabled = 'true';
    const failure = new Error('synchronous transport failure');
    transport.dispatch.mockImplementation(() => {
      throw failure;
    });
    const warning = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    await expect(
      service.notifyAdminOfOrderPlaced('order-id', 'ORD-123'),
    ).resolves.toBeUndefined();

    expect(warning).toHaveBeenCalledWith(
      'Notification dispatch failed for event admin.order_placed',
    );
    expect(warning.mock.calls.flat().join(' ')).not.toContain(failure.message);
  });
});
