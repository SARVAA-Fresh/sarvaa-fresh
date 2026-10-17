import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService, STORAGE_PROVIDER } from './storage.service';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { R2StorageProvider } from './providers/r2-storage.provider';

@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const provider = config.get<string>('STORAGE_PROVIDER', 'local');

        if (provider === 'r2') {
          return new R2StorageProvider(config);
        }

        if (provider === 'local') {
          return new LocalStorageProvider(config);
        }

        throw new Error(`Unsupported STORAGE_PROVIDER: ${provider}`);
      },
    },
    StorageService,
  ],
  exports: [StorageService, STORAGE_PROVIDER],
})
export class StorageModule {}
