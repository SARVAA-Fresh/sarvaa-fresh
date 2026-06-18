import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma, User } from '@prisma/client';

export type SafeUser = Omit<User, 'passwordHash' | 'deletedAt' | 'isActive'>;

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  private stripSensitiveFields(user: User): SafeUser {
    const { passwordHash, deletedAt, isActive, ...safeUser } = user;
    passwordHash;
    deletedAt;
    isActive;
    return safeUser as SafeUser;
  }

  async findById(id: string): Promise<SafeUser> {
    const user = await this.prismaService.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.stripSensitiveFields(user);
  }

  async findByMobile(mobile: string): Promise<SafeUser | null> {
    const user = await this.prismaService.user.findFirst({
      where: { mobile, deletedAt: null },
    });

    return user ? this.stripSensitiveFields(user) : null;
  }

  async create(data: Prisma.UserCreateInput): Promise<SafeUser> {
    const user = await this.prismaService.user.create({
      data,
    });
    return this.stripSensitiveFields(user);
  }

  async findAll(args?: Prisma.UserFindManyArgs): Promise<SafeUser[]> {
    const users = await this.prismaService.user.findMany({
      ...args,
      where: { ...args?.where, deletedAt: null },
    });

    return users.map((user) => this.stripSensitiveFields(user));
  }

  async update(
    id: string,
    data: Prisma.UserUpdateInput,
  ): Promise<SafeUser> {
    const existing = await this.prismaService.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const user = await this.prismaService.user.update({
      where: { id: existing.id },
      data,
    });

    return this.stripSensitiveFields(user);
  }

  async softDelete(id: string): Promise<SafeUser> {
    const existing = await this.prismaService.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const user = await this.prismaService.user.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });

    return this.stripSensitiveFields(user);
  }
}