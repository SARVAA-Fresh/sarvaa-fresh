import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(id: string): Promise<User> {
    const user = await this.prismaService.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByMobile(mobile: string): Promise<User | null> {
    return this.prismaService.user.findUnique({
      where: { mobile },
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prismaService.user.create({
      data,
    });
  }

  async findAll(args?: Prisma.UserFindManyArgs): Promise<User[]> {
    return this.prismaService.user.findMany(args);
  }

  async update(
    id: string,
    data: Prisma.UserUpdateInput,
  ): Promise<User> {
    return this.prismaService.user.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string): Promise<User> {
    return this.prismaService.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}