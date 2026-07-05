import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductImage, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';
import { StorageSaveResult } from '@/storage/interfaces/storage-provider.interface';
import { UpdateProductImageDto } from './dto/update-product-image.dto';

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_IMAGES_PER_REQUEST = 5;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Injectable()
export class ProductImagesService {
  private readonly logger = new Logger(ProductImagesService.name);
  private readonly maxFileSize: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    configService: ConfigService,
  ) {
    const configured = configService.get<number>('UPLOAD_MAX_FILE_SIZE');
    this.maxFileSize =
      typeof configured === 'number' && configured > 0
        ? configured
        : DEFAULT_MAX_FILE_SIZE;
  }

  async uploadImages(
    productId: string,
    files: Express.Multer.File[],
  ): Promise<ProductImage[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file must be provided');
    }
    if (files.length > MAX_IMAGES_PER_REQUEST) {
      throw new BadRequestException(
        `A maximum of ${MAX_IMAGES_PER_REQUEST} images may be uploaded per request`,
      );
    }

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        throw new BadRequestException(
          `Unsupported file type "${file.mimetype}". Allowed types: JPEG, PNG, WebP.`,
        );
      }
      if (file.size > this.maxFileSize) {
        throw new BadRequestException(
          `File "${file.originalname}" exceeds maximum size of ${this.maxFileSize} bytes.`,
        );
      }
    }

    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Persist files first; keep both the public URL (for DB rows) and the
    // storage key (for cleanup) so we never need to reconstruct either.
    const savedResults: StorageSaveResult[] = [];
    try {
      for (const file of files) {
        const result = await this.storageService.saveImage(file);
        savedResults.push(result);
      }
    } catch (error) {
      await this.cleanupFiles(savedResults.map((r) => r.key));
      throw error;
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const maxSort = await tx.productImage.aggregate({
          where: { productId, deletedAt: null },
          _max: { sortOrder: true },
        });
        const baseSortOrder = (maxSort._max.sortOrder ?? -1) + 1;

        const existingActiveCount = await tx.productImage.count({
          where: { productId, deletedAt: null },
        });
        const promoteFirstToPrimary = existingActiveCount === 0;

        const created: ProductImage[] = [];
        for (let i = 0; i < savedResults.length; i++) {
          const image = await tx.productImage.create({
            data: {
              productId,
              imageUrl: savedResults[i].url,
              sortOrder: baseSortOrder + i,
              isPrimary: promoteFirstToPrimary && i === 0,
            },
          });
          created.push(image);
        }

        if (promoteFirstToPrimary && created.length > 0) {
          await tx.product.update({
            where: { id: productId },
            data: { imageUrl: created[0].imageUrl },
          });
        }

        return created;
      });
    } catch (error) {
      await this.cleanupFiles(savedResults.map((r) => r.key));
      throw error;
    }
  }

  async updateImage(
    productId: string,
    imageId: string,
    dto: UpdateProductImageDto,
  ): Promise<ProductImage> {
    const existing = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Product image not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const data: Prisma.ProductImageUpdateInput = {};
      if (dto.altText !== undefined) data.altText = dto.altText;
      if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

      const becomingPrimary = dto.isPrimary === true;
      const losingPrimary = dto.isPrimary === false && existing.isPrimary;

      if (becomingPrimary) {
        // Clear the primary flag from every other active image of this
        // product before raising it on the target image.
        await tx.productImage.updateMany({
          where: {
            productId,
            deletedAt: null,
            isPrimary: true,
            id: { not: imageId },
          },
          data: { isPrimary: false },
        });
        data.isPrimary = true;
      } else if (dto.isPrimary === false) {
        data.isPrimary = false;
      }

      const updated = await tx.productImage.update({
        where: { id: imageId },
        data,
      });

      if (becomingPrimary) {
        await tx.product.update({
          where: { id: productId },
          data: { imageUrl: updated.imageUrl },
        });
      } else if (losingPrimary) {
        // The user explicitly demoted the current primary. Promote the
        // next active image (or null out Product.imageUrl) so the
        // product's public representation stays in sync with the table.
        const next = await tx.productImage.findFirst({
          where: { productId, deletedAt: null, id: { not: imageId } },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        });
        if (next) {
          await tx.productImage.update({
            where: { id: next.id },
            data: { isPrimary: true },
          });
          await tx.product.update({
            where: { id: productId },
            data: { imageUrl: next.imageUrl },
          });
        } else {
          await tx.product.update({
            where: { id: productId },
            data: { imageUrl: null },
          });
        }
      }

      return updated;
    });
  }

  async deleteImage(productId: string, imageId: string): Promise<void> {
    const existing = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Product image not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productImage.update({
        where: { id: imageId },
        data: { deletedAt: new Date() },
      });

      if (existing.isPrimary) {
        const next = await tx.productImage.findFirst({
          where: { productId, deletedAt: null },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        });
        if (next) {
          await tx.productImage.update({
            where: { id: next.id },
            data: { isPrimary: true },
          });
          await tx.product.update({
            where: { id: productId },
            data: { imageUrl: next.imageUrl },
          });
        } else {
          await tx.product.update({
            where: { id: productId },
            data: { imageUrl: null },
          });
        }
      }
    });

    // DB consistency wins over physical deletion. The local storage
    // provider already swallows missing-file errors, but we still guard
    // here so a thrown error from any future provider is logged, not
    // raised, preserving the soft-delete semantics.
    const key = this.extractStorageKey(existing.imageUrl);
    if (key) {
      try {
        await this.storageService.deleteImage(key);
      } catch (error) {
        this.logger.warn(
          `Failed to delete physical file "${key}" for image ${imageId}: ${(error as Error).message}`,
        );
      }
    }
  }

  /**
   * Best-effort cleanup of files saved during this request. Errors are
   * swallowed because the caller is already on an error path and must
   * surface the original failure.
   */
  private async cleanupFiles(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await Promise.allSettled(
      keys.map((key) => this.storageService.deleteImage(key)),
    );
  }

  /**
   * Derive the storage key from a stored public URL. The local provider
   * always returns `${urlPrefix}/${filename}`, so the trailing segment
   * is the storage key.
   */
  private extractStorageKey(url: string): string {
    if (!url) return '';
    const parts = url.split('/');
    return parts[parts.length - 1] ?? '';
  }
}
