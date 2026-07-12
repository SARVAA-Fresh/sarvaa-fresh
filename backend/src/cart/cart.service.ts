import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private async findOrCreateCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          userId,
          subtotal: new Prisma.Decimal(0),
        },
      });
    }

    return cart;
  }

  private async findOrCreateCartTx(tx: Prisma.TransactionClient, userId: string) {
    let cart = await tx.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await tx.cart.create({
        data: {
          userId,
          subtotal: new Prisma.Decimal(0),
        },
      });
    }

    return cart;
  }

  private async recalculateSubtotal(cartId: string) {
    const result = await this.prisma.cartItem.aggregate({
      where: { cartId, deletedAt: null },
      _sum: { totalPrice: true },
    });

    const subtotal = result._sum.totalPrice ?? new Prisma.Decimal(0);

    return this.prisma.cart.update({
      where: { id: cartId },
      data: { subtotal },
    });
  }

  private async recalculateSubtotalTx(tx: Prisma.TransactionClient, cartId: string) {
    const result = await tx.cartItem.aggregate({
      where: { cartId, deletedAt: null },
      _sum: { totalPrice: true },
    });

    const subtotal = result._sum.totalPrice ?? new Prisma.Decimal(0);

    return tx.cart.update({
      where: { id: cartId },
      data: { subtotal },
    });
  }

  private async getCartTx(tx: Prisma.TransactionClient, userId: string) {
    const cart = await this.findOrCreateCartTx(tx, userId);
    const items = await tx.cartItem.findMany({
      where: { cartId: cart.id, deletedAt: null },
      include: { variant: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return {
      ...cart,
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: cart.subtotal.toString(),
    };
  }

  async getCart(userId: string) {
    const cart = await this.findOrCreateCart(userId);

    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id, deletedAt: null },
      include: { variant: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return {
      ...cart,
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: cart.subtotal.toString(),
    };
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    return this.prisma.$transaction(async (tx) => {
      const cart = await this.findOrCreateCartTx(tx, userId);

      const variant = await tx.productVariant.findUnique({
        where: { id: dto.variantId },
      });

      if (!variant || variant.deletedAt) {
        throw new NotFoundException('Product variant not found');
      }

      const inventory = await tx.inventory.findUnique({
        where: { variantId: dto.variantId },
      });

      if (!inventory || inventory.deletedAt) {
        throw new BadRequestException('Variant is out of stock');
      }

      const existingItem = await tx.cartItem.findFirst({
        where: { cartId: cart.id, variantId: dto.variantId },
      });

      const baseQuantity = existingItem?.deletedAt ? 0 : existingItem?.quantity ?? 0;
      const newQuantity = baseQuantity + dto.quantity;

      if (newQuantity > inventory.availableStock) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${inventory.availableStock}, Requested: ${newQuantity}`,
        );
      }

      const unitPrice = new Prisma.Decimal(variant.price.toString());
      const totalPrice = unitPrice.mul(newQuantity);

      if (existingItem) {
        await tx.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: newQuantity,
            unitPrice,
            totalPrice,
            deletedAt: null,
          },
        });
      } else {
        await tx.cartItem.create({
          data: {
            cartId: cart.id,
            variantId: dto.variantId,
            quantity: dto.quantity,
            unitPrice,
            totalPrice,
          },
        });
      }

      await this.recalculateSubtotalTx(tx, cart.id);

      return this.getCartTx(tx, userId);
    });
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const cart = await this.findOrCreateCart(userId);

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    const inventory = await this.prisma.inventory.findUnique({
      where: { variantId: item.variantId },
    });

    if (!inventory || inventory.deletedAt) {
      throw new BadRequestException('Variant is out of stock');
    }

    if (dto.quantity > inventory.availableStock) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${inventory.availableStock}, Requested: ${dto.quantity}`,
      );
    }

    const totalPrice = new Prisma.Decimal(item.unitPrice.toString()).mul(
      dto.quantity,
    );

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity, totalPrice },
    });

    await this.recalculateSubtotal(cart.id);

    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.findOrCreateCart(userId);

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { deletedAt: new Date() },
    });

    await this.recalculateSubtotal(cart.id);

    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.findOrCreateCart(userId);

    await this.prisma.cartItem.updateMany({
      where: { cartId: cart.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { subtotal: new Prisma.Decimal(0) },
    });

    return this.getCart(userId);
  }
}
