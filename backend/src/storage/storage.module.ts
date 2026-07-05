import { Module } from '@nestjs/common';
import { StorageService, STORAGE_PROVIDER } from './storage.service';
import { LocalStorageProvider } from './providers/local-storage.provider';

@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useClass: LocalStorageProvider,
    },
    StorageService,
  ],
  exports: [StorageService, STORAGE_PROVIDER],
})
export class StorageModule {}
