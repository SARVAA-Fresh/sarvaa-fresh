import { Module } from '@nestjs/common';
import { InventoryModule } from '@/inventory/inventory.module';
import { NotificationsModule } from '@/notifications/notifications.module';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminOrdersService } from './admin-orders.service';

@Module({
  imports: [InventoryModule, NotificationsModule],
  controllers: [AdminOrdersController],
  providers: [AdminOrdersService],
  exports: [AdminOrdersService],
})
export class AdminOrdersModule {}