import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ProductQueryDto): Promise<{
    items: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, search, categoryId, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
    };

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          variants: {
            where: { deletedAt: null },
            take: 1,
            orderBy: { isDefault: 'desc' },
          },
          images: {
            where: { deletedAt: null },
            orderBy: { sortOrder: 'asc' },
            take: 5,
          },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<any> {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        variants: {
          where: { deletedAt: null },
          orderBy: { isDefault: 'desc' },
        },
        images: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async findBySlug(slug: string): Promise<any> {
    const product = await this.prisma.product.findFirst({
      where: { slug, deletedAt: null },
      include: {
        category: true,
        variants: {
          where: { deletedAt: null },
          orderBy: { isDefault: 'desc' },
        },
        images: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async create(dto: CreateProductDto): Promise<any> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Create product (without variants array)
        const { variants, ...productData } = dto;

        const product = await tx.product.create({
          data: productData,
        });

        // Create variants if provided
        if (variants && variants.length > 0) {
          for (const variant of variants) {
            const createdVariant = await tx.productVariant.create({
              data: {
                productId: product.id,
                sku: variant.sku,
                variantName: variant.variantName,
                unit: variant.unit,
                weight: variant.weight ? new Prisma.Decimal(variant.weight.toString()) : null,
                price: new Prisma.Decimal(variant.price.toString()),
                mrp: variant.mrp ? new Prisma.Decimal(variant.mrp.toString()) : null,
                isDefault: variant.isDefault ?? false,
                isActive: variant.isActive ?? true,
              },
            });

            // Create inventory record for the variant
            await tx.inventory.create({
              data: {
                variantId: createdVariant.id,
                availableStock: 0,
                reservedStock: 0,
              },
            });
          }
        }

        // Return the created product with relations
        return tx.product.findUnique({
          where: { id: product.id },
          include: {
            category: true,
            variants: { where: { deletedAt: null } },
            images: { where: { deletedAt: null } },
          },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Slug or SKU already exists');
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('Invalid category ID');
        }
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateProductDto): Promise<any> {
    // Strip out variants from dto - they are updated separately
    const { variants, ...updateData } = dto;

    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
          variants: { where: { deletedAt: null } },
          images: { where: { deletedAt: null } },
        },
      });

      return product;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Product not found');
        }
        if (error.code === 'P2002') {
          throw new ConflictException('Slug already exists');
        }
      }
      throw error;
    }
  }

  async softDelete(id: string): Promise<any> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Soft delete the product
        const product = await tx.product.update({
          where: { id },
          data: { deletedAt: new Date() },
        });

        // Soft delete all variants
        await tx.productVariant.updateMany({
          where: { productId: id },
          data: { deletedAt: new Date() },
        });

        return product;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Product not found');
        }
      }
      throw error;
    }
  }
}