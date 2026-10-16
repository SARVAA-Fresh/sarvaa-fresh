import { Injectable } from '@nestjs/common';
import { NotificationTransport, OrderNotification } from './notification-transport';

@Injectable()
export class NoopNotificationTransport extends NotificationTransport {
  async dispatch(_notification: OrderNotification): Promise<void> {}
}
