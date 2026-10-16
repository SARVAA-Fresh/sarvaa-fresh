import { OrderStatus } from '@prisma/client';

export type OrderNotification =
  | {
      type: 'admin.order_placed';
      orderId: string;
      orderNumber: string;
    }
  | {
      type: 'customer.order_status_changed';
      orderId: string;
      orderNumber: string;
      customerId: string;
      status: OrderStatus;
    };

export abstract class NotificationTransport {
  abstract dispatch(notification: OrderNotification): Promise<void>;
}
