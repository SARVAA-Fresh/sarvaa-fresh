import { Inject, Injectable } from '@nestjs/common';
import {
  IStorageProvider,
  StorageSaveResult,
} from './interfaces/storage-provider.interface';

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

@Injectable()
export class StorageService {
  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: IStorageProvider,
  ) {}

  /**
   * Persist an uploaded image and return its public URL + storage key.
   */
  saveImage(file: Express.Multer.File): Promise<StorageSaveResult> {
    return this.storageProvider.save(file);
  }

  /**
   * Remove a previously stored image by its storage key. Failures are
   * absorbed by the underlying provider so DB operations can proceed.
   */
  deleteImage(key: string): Promise<void> {
    return this.storageProvider.delete(key);
  }
}
