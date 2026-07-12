import { Module } from '@nestjs/common';
import { AdminPaymentsController, PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StorageModule } from '@/storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
