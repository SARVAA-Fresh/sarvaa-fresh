import { Module } from '@nestjs/common';
import { NoopNotificationTransport } from './noop-notification-transport';
import { NotificationTransport } from './notification-transport';
import { NotificationsService } from './notifications.service';

@Module({
  providers: [
    NotificationsService,
    {
      provide: NotificationTransport,
      useClass: NoopNotificationTransport,
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
