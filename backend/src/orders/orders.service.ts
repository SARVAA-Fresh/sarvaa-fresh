import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { NotificationsService } from '@/notifications/notifications.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private generateOrderNumber(): string {
    return `ORD-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  }

  private buildAddressSnapshot(address: any) {
    const parts = [
      address.addressLine1,
      address.addressLine2,
      address.landmark,
      address.area,
    ].filter(Boolean);
    return {
      deliveryName: address.fullName,
      deliveryPhone: address.mobile,
      deliveryAddress: parts.join(', '),
      deliveryCity: address.city,
      deliveryState: address.state,
      deliveryPincode: address.pincode,
    };
  }

  async create(userId: string, dto: CreateOrderDto) {
    const order = await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: {
          items: {
            where: { deletedAt: null },
            include: { variant: { include: { product: { include: { images: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } } } } } } },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      const address = await tx.address.findUnique({
        where: { id: dto.addressId },
      });

      if (!address || address.deletedAt) {
        throw new NotFoundException('Address not found');
      }

      if (address.userId !== userId) {
        throw new ForbiddenException('You can only use your own addresses');
      }

      const inventories = await tx.inventory.findMany({
        where: {
          variantId: { in: cart.items.map((item) => item.variantId) },
          deletedAt: null,
        },
      });
      const inventoryByVariantId = new Map(
        inventories.map((inventory) => [inventory.variantId, inventory]),
      );

      for (const item of cart.items) {
        const inventory = inventoryByVariantId.get(item.variantId);

        if (!inventory) {
          throw new BadRequestException(
            `Product variant ${item.variant.product.name} is out of stock`,
          );
        }

        const newAvailableStock = inventory.availableStock - item.quantity;
        const newReservedStock = inventory.reservedStock + item.quantity;

        try {
          await tx.inventory.update({
            where: {
              id: inventory.id,
              availableStock: { gte: item.quantity },
              deletedAt: null,
            },
            data: {
              availableStock: { decrement: item.quantity },
              reservedStock: { increment: item.quantity },
              isInStock: newAvailableStock > 0,
            },
          });
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2025'
          ) {
            throw new BadRequestException(
              `Insufficient stock for ${item.variant.product.name}. Available: ${inventory.availableStock}, Requested: ${item.quantity}`,
            );
          }
          throw error;
        }

        inventory.availableStock = newAvailableStock;
        inventory.reservedStock = newReservedStock;
        inventory.isInStock = newAvailableStock > 0;
      }

      let subtotal = new Prisma.Decimal(0);
      for (const item of cart.items) {
        subtotal = subtotal.add(new Prisma.Decimal(item.totalPrice.toString()));
      }

      const deliveryFee = new Prisma.Decimal(0);
      const totalAmount = subtotal.add(deliveryFee);

      const order = await tx.order.create({
        data: {
          userId,
          addressId: dto.addressId,
          orderNumber: this.generateOrderNumber(),
          subtotal,
          deliveryFee,
          totalAmount,
          currentStatus: 'PENDING',
          paymentStatus: 'PENDING',
          ...this.buildAddressSnapshot(address),
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'PENDING',
          remarks: 'Order Placed',
        },
      });

      await tx.orderItem.createMany({
        data: cart.items.map((item) => ({
          orderId: order.id,
          variantId: item.variantId,
          productNameSnapshot: item.variant.product.name,
          unitPrice: new Prisma.Decimal(item.variant.price.toString()),
          quantity: item.quantity,
          totalPrice: new Prisma.Decimal(item.totalPrice.toString()),
        })),
      });

      await tx.inventoryTransaction.createMany({
        data: cart.items.map((item) => {
          const inv = inventoryByVariantId.get(item.variantId)!;
          return {
            variantId: item.variantId,
            inventoryId: inv.id,
            type: 'RESERVE' as const,
            quantityChange: -item.quantity,
            availableStockAfter: inv.availableStock,
            reservedStockAfter: inv.reservedStock,
            reason: 'Stock reserved for order',
            referenceId: order.id,
            referenceType: 'Order',
          };
        }),
      });

      // 4. Clear cart items
      await tx.cartItem.updateMany({
        where: { cartId: cart.id, deletedAt: null },
        data: { deletedAt: new Date() },
      });

      // 5. Reset cart subtotal
      await tx.cart.update({
        where: { id: cart.id },
        data: { subtotal: new Prisma.Decimal(0) },
      });

      return tx.order.findUnique({
        where: { id: order.id },
        include: {
          address: true,
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    include: {
                      images: {
                        where: { deletedAt: null },
                        orderBy: { sortOrder: 'asc' },
                      },
                    },
                  },
                },
              },
            },
          },
          payments: {
            orderBy: { createdAt: 'desc' },
          },
          statusHistory: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    });

    if (order) {
      await this.notifications.notifyAdminOfOrderPlaced(
        order.id,
        order.orderNumber,
      );
    }

    return order;
  }

  async findAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId, deletedAt: null },
        include: {
          address: true,
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    include: {
                      images: {
                        where: { deletedAt: null },
                        orderBy: { sortOrder: 'asc' },
                      },
                    },
                  },
                },
              },
            },
          },
          payments: {
            orderBy: { createdAt: 'desc' },
          },
          statusHistory: {
            orderBy: { createdAt: 'desc' },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where: { userId, deletedAt: null } }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(userId: string, id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        address: true,
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: {
                      where: { deletedAt: null },
                      orderBy: { sortOrder: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order || order.deletedAt) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('You can only access your own orders');
    }

    return order;
  }

  async cancel(userId: string, id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order || order.deletedAt) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own orders');
    }

    if (!['PENDING', 'CONFIRMED', 'PACKING'].includes(order.currentStatus)) {
      throw new BadRequestException(
        'Order can only be cancelled before it is out for delivery',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Release reserved inventory
      for (const item of order.items) {
        const inv = await tx.inventory.findFirst({
          where: { variantId: item.variantId, deletedAt: null },
        });
        if (!inv) {
          throw new BadRequestException(
            `Inventory not found for variant ${item.variantId}`,
          );
        }
        const newAvailable = inv.availableStock + item.quantity;
        const newReserved = Math.max(0, inv.reservedStock - item.quantity);

        await tx.inventory.update({
          where: { variantId: item.variantId },
          data: {
            availableStock: newAvailable,
            reservedStock: newReserved,
            isInStock: newAvailable > 0,
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            variantId: item.variantId,
            inventoryId: inv.id,
            type: 'RELEASE',
            quantityChange: item.quantity,
            availableStockAfter: newAvailable,
            reservedStockAfter: newReserved,
            reason: 'Stock released from cancelled order',
            referenceId: order.id,
            referenceType: 'Order',
          },
        });
      }

      const updated = await tx.order.update({
        where: { id },
        data: { currentStatus: 'CANCELLED' },
        include: {
          address: true,
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    include: {
                      images: {
                        where: { deletedAt: null },
                        orderBy: { sortOrder: 'asc' },
                      },
                    },
                  },
                },
              },
            },
          },
          payments: {
            orderBy: { createdAt: 'desc' },
          },
          statusHistory: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status: 'CANCELLED',
          remarks: 'Order Cancelled',
        },
      });

      return updated;
    });
  }
}
