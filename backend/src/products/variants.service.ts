import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<any> {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id, deletedAt: null },
      include: {
        product: {
          select: { id: true, name: true },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    return variant;
  }

  async create(productId: string, dto: CreateVariantDto): Promise<any> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Verify product exists and is not deleted
        const product = await tx.product.findFirst({
          where: { id: productId, deletedAt: null },
        });

        if (!product) {
          throw new NotFoundException('Product not found');
        }

        // Create the variant
        const variant = await tx.productVariant.create({
          data: {
            productId,
            sku: dto.sku,
            variantName: dto.variantName,
            unit: dto.unit,
            weight: dto.weight ? new Prisma.Decimal(dto.weight) : null,
            price: new Prisma.Decimal(dto.price.toString()),
            mrp: dto.mrp ? new Prisma.Decimal(dto.mrp.toString()) : null,
            isDefault: dto.isDefault ?? false,
            isActive: dto.isActive ?? true,
          },
        });

        // Create inventory record with default stock
        await tx.inventory.create({
          data: {
            variantId: variant.id,
            availableStock: 0,
            reservedStock: 0,
          },
        });

        return variant;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('SKU already exists');
        }
        if (error.code === 'P2025') {
          throw new NotFoundException('Product not found');
        }
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateVariantDto): Promise<any> {
    try {
      const updateData: any = { ...dto };

      // Convert price and mrp to Decimal if present
      if (updateData.price !== undefined) {
        updateData.price = new Prisma.Decimal(updateData.price.toString());
      }
      if (updateData.mrp !== undefined) {
        updateData.mrp = new Prisma.Decimal(updateData.mrp.toString());
      }
      if (updateData.weight !== undefined && updateData.weight !== null) {
        updateData.weight = new Prisma.Decimal(updateData.weight);
      }

      const variant = await this.prisma.productVariant.update({
        where: { id },
        data: updateData,
      });

      return variant;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Variant not found');
        }
        if (error.code === 'P2002') {
          throw new ConflictException('SKU already exists');
        }
      }
      throw error;
    }
  }

  async softDelete(id: string): Promise<any> {
    try {
      const variant = await this.prisma.productVariant.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      return variant;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Variant not found');
        }
      }
      throw error;
    }
  }
}