import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '@prisma/client';
import {
  NotificationTransport,
  OrderNotification,
} from './notification-transport';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly transport: NotificationTransport,
  ) {}

  notifyAdminOfOrderPlaced(orderId: string, orderNumber: string): Promise<void> {
    return this.dispatch({ type: 'admin.order_placed', orderId, orderNumber });
  }

  notifyCustomerOfOrderStatus(
    orderId: string,
    orderNumber: string,
    customerId: string,
    status: OrderStatus,
  ): Promise<void> {
    return this.dispatch({
      type: 'customer.order_status_changed',
      orderId,
      orderNumber,
      customerId,
      status,
    });
  }

  private async dispatch(notification: OrderNotification): Promise<void> {
    if (this.config.get<string>('ORDER_NOTIFICATIONS_ENABLED') !== 'true') {
      return;
    }

    try {
      await this.transport.dispatch(notification);
    } catch {
      this.logger.warn(
        `Notification dispatch failed for event ${notification.type}`,
      );
    }
  }
}
