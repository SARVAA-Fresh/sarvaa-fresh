import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { IStorageProvider, StorageSaveResult } from '../interfaces/storage-provider.interface';

/**
 * Maps an allowed MIME type to its canonical lower-case file extension.
 * Only image MIME types we explicitly support are accepted.
 */
const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly uploadDir: string;
  private readonly urlPrefix: string;

  constructor(configService: ConfigService) {
    const configuredPath = configService.get<string>('UPLOAD_LOCAL_PATH');
    const configuredPrefix = configService.get<string>('UPLOAD_LOCAL_URL_PREFIX');

    this.uploadDir = this.resolveUploadDir(configuredPath);
    this.urlPrefix = this.normalizeUrlPrefix(configuredPrefix);

    this.logger.log(
      `LocalStorageProvider initialised at "${this.uploadDir}" (prefix "${this.urlPrefix}")`,
    );
  }

  async save(file: Express.Multer.File): Promise<StorageSaveResult> {
    if (!file) {
      throw new BadRequestException('No file provided for storage');
    }

    const extension = this.resolveExtension(file);
    const filename = `${randomUUID()}${extension}`;
    const absolutePath = path.join(this.uploadDir, filename);

    // Final defensive check: the resolved path must remain inside uploadDir.
    const resolved = path.resolve(absolutePath);
    const resolvedRoot = path.resolve(this.uploadDir) + path.sep;
    if (!resolved.startsWith(resolvedRoot)) {
      throw new BadRequestException('Invalid file path');
    }

    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.writeFile(resolved, file.buffer);
    } catch (error) {
      this.logger.error(
        `Failed to write uploaded file "${filename}": ${(error as Error).message}`,
      );
      throw new InternalServerErrorException('Failed to store uploaded file');
    }

    const url = `${this.urlPrefix}/${filename}`;
    return { url, key: filename };
  }

  async delete(key: string): Promise<void> {
    if (!key) return;

    // Strip any directory components the caller may have supplied so the
    // file system operation cannot escape uploadDir.
    const safeName = path.basename(key);

    if (!safeName || safeName === '.' || safeName === '..') {
      this.logger.warn(`Refusing to delete unsafe key: "${key}"`);
      return;
    }

    if (!ALLOWED_EXTENSIONS.has(path.extname(safeName).toLowerCase())) {
      this.logger.warn(`Refusing to delete file with unexpected extension: "${safeName}"`);
      return;
    }

    const absolutePath = path.resolve(this.uploadDir, safeName);
    const resolvedRoot = path.resolve(this.uploadDir) + path.sep;
    if (!absolutePath.startsWith(resolvedRoot)) {
      this.logger.warn(`Refusing to delete path outside upload dir: "${key}"`);
      return;
    }

    try {
      await fs.unlink(absolutePath);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err && err.code === 'ENOENT') {
        // Missing file is treated as a successful no-op.
        return;
      }
      // Log but do not throw — callers should treat physical deletion
      // failures as non-fatal so DB consistency is preserved.
      this.logger.warn(
        `Failed to delete file "${safeName}": ${err?.message ?? 'unknown error'}`,
      );
    }
  }

  /**
   * Resolve and validate the upload directory from configuration.
   * Always returned as an absolute path anchored at the current working
   * directory so that path-joining cannot escape into unrelated trees.
   */
  private resolveUploadDir(configured?: string): string {
    const candidate = (configured && configured.trim()) || './uploads';
    const absolute = path.isAbsolute(candidate)
      ? candidate
      : path.resolve(process.cwd(), candidate);
    return absolute;
  }

  /**
   * Normalise the public URL prefix: ensure it begins with a single
   * forward slash and does not end with one.
   */
  private normalizeUrlPrefix(configured?: string): string {
    const candidate = (configured && configured.trim()) || '/uploads';
    const trimmed = candidate.replace(/\/+$/, '');
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  /**
   * Pick a safe extension based on the MIME type only — never trust the
   * original filename's extension.
   */
  private resolveExtension(file: Express.Multer.File): string {
    const ext = MIME_TO_EXTENSION[file.mimetype];
    if (!ext) {
      throw new BadRequestException(
        `Unsupported file type "${file.mimetype}". Allowed types: JPEG, PNG, WebP.`,
      );
    }
    return ext;
  }
}
