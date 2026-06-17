import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { Address } from '@prisma/client';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateAddressDto): Promise<Address> {
    const data: CreateAddressDto & { userId: string } = {
      ...dto,
      userId,
    };

    if (dto.isDefault) {
      return this.prisma.$transaction(async (tx) => {
        await tx.address.updateMany({
          where: { userId, isDefault: true, deletedAt: null },
          data: { isDefault: false },
        });

        return tx.address.create({ data });
      });
    }

    return this.prisma.address.create({ data });
  }

  async findAll(userId: string): Promise<Address[]> {
    return this.prisma.address.findMany({
      where: { userId, deletedAt: null },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findById(userId: string, id: string): Promise<Address> {
    const address = await this.prisma.address.findUnique({
      where: { id },
    });

    if (!address || address.deletedAt) {
      throw new NotFoundException('Address not found');
    }

    if (address.userId !== userId) {
      throw new ForbiddenException('You can only access your own addresses');
    }

    return address;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateAddressDto,
  ): Promise<Address> {
    const existing = await this.findById(userId, id);

    const data = { ...dto };

    if (dto.isDefault) {
      return this.prisma.$transaction(async (tx) => {
        await tx.address.updateMany({
          where: { userId, isDefault: true, deletedAt: null, id: { not: id } },
          data: { isDefault: false },
        });

        return tx.address.update({
          where: { id },
          data,
        });
      });
    }

    return this.prisma.address.update({
      where: { id },
      data,
    });
  }

  async softDelete(userId: string, id: string): Promise<Address> {
    const existing = await this.findById(userId, id);

    return this.prisma.address.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });
  }

  async setDefault(userId: string, id: string): Promise<Address> {
    const existing = await this.findById(userId, id);

    if (existing.isDefault) {
      return existing;
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { userId, isDefault: true, deletedAt: null },
        data: { isDefault: false },
      });

      return tx.address.update({
        where: { id },
        data: { isDefault: true },
      });
    });
  }
}
