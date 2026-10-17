import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import {
  IStorageProvider,
  StorageSaveResult,
} from '../interfaces/storage-provider.interface';

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const ALLOWED_MIME_TYPES = new Set(Object.keys(MIME_TO_EXTENSION));

@Injectable()
export class R2StorageProvider implements IStorageProvider {
  private readonly logger = new Logger(R2StorageProvider.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(config: ConfigService) {
    const accountId = config.get<string>('R2_ACCOUNT_ID')?.trim();
    const accessKeyId = config.get<string>('R2_ACCESS_KEY_ID')?.trim();
    const secretAccessKey = config.get<string>('R2_SECRET_ACCESS_KEY')?.trim();
    const bucket = config.get<string>('R2_BUCKET_NAME')?.trim();
    const publicUrl = config.get<string>('R2_PUBLIC_URL')?.trim();

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
      throw new Error(
        'STORAGE_PROVIDER=r2 requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, ' +
        'R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_URL',
      );
    }

    let parsedPublicUrl: URL;
    try {
      parsedPublicUrl = new URL(publicUrl);
    } catch {
      throw new Error('R2_PUBLIC_URL must be a valid HTTPS URL');
    }

    if (parsedPublicUrl.protocol !== 'https:') {
      throw new Error('R2_PUBLIC_URL must use HTTPS');
    }

    this.bucket = bucket;
    this.publicUrl = publicUrl.replace(/\/+$/, '');

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    this.logger.log(`R2StorageProvider initialised for bucket "${bucket}"`);
  }

  async save(file: Express.Multer.File): Promise<StorageSaveResult> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No file provided for storage');
    }

    const extension = MIME_TO_EXTENSION[file.mimetype];
    if (!extension || !ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Unsupported file type. Allowed types: JPEG, PNG, WebP.',
      );
    }

    const key = `${randomUUID()}${extension}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    } catch (error) {
      this.logger.error(
        `R2 upload failed: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException('Failed to store uploaded file');
    }

    return {
      key,
      url: `${this.publicUrl}/${key}`,
    };
  }

  async delete(key: string): Promise<void> {
    // Keys are generated UUID filenames, never arbitrary paths.
    if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(key)) {
      this.logger.warn('Refusing to delete an invalid R2 object key');
      return;
    }

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      this.logger.warn(`R2 delete failed: ${(error as Error).message}`);
      throw error;
    }
  }
}
