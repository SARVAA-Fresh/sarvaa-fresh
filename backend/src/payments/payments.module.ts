import { Module } from '@nestjs/common';
import { AdminPaymentsController, PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StorageModule } from '@/storage/storage.module';
import { SettingsModule } from '@/settings/settings.module';

@Module({
  imports: [StorageModule, SettingsModule],
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
