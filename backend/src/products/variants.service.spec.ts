import { Test, TestingModule } from '@nestjs/testing';
import { VariantsService } from './variants.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('VariantsService', () => {
  let service: VariantsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    productVariant: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
    },
    inventory: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VariantsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<VariantsService>(VariantsService);
    prismaService = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return a variant by id', async () => {
      const mockVariant = {
        id: 'v1',
        sku: 'SKU-1',
        variantName: 'Variant 1',
        product: { id: 'p1', name: 'Product 1' },
      };
      mockPrismaService.productVariant.findFirst.mockResolvedValue(mockVariant);

      const result = await service.findById('v1');

      expect(result).toEqual(mockVariant);
      expect(mockPrismaService.productVariant.findFirst).toHaveBeenCalledWith({
        where: { id: 'v1', deletedAt: null },
        include: { product: { select: { id: true, name: true } } },
      });
    });

    it('should throw NotFoundException when variant not found', async () => {
      mockPrismaService.productVariant.findFirst.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a variant with inventory', async () => {
      const createDto = {
        sku: 'SKU-NEW',
        variantName: 'New Variant',
        unit: 'kg',
        price: 100,
      };
      const mockVariant = { id: 'v1', productId: 'p1', ...createDto };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          product: {
            findFirst: jest.fn().mockResolvedValue({ id: 'p1' }),
          },
          productVariant: {
            create: jest.fn().mockResolvedValue(mockVariant),
          },
          inventory: {
            create: jest.fn().mockResolvedValue({ id: 'i1' }),
          },
        };
        return callback(tx);
      });

      const result = await service.create('p1', createDto);

      expect(result).toEqual(mockVariant);
    });

    it('should throw NotFoundException when product not found', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          product: {
            findFirst: jest.fn().mockResolvedValue(null),
          },
          productVariant: {
            create: jest.fn(),
          },
          inventory: {
            create: jest.fn(),
          },
        };
        return callback(tx);
      });

      await expect(
        service.create('non-existent', {
          sku: 'SKU-1',
          variantName: 'V1',
          unit: 'kg',
          price: 100,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException on duplicate SKU', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });
      mockPrismaService.$transaction.mockRejectedValue(error);

      await expect(
        service.create('p1', {
          sku: 'DUPLICATE',
          variantName: 'V1',
          unit: 'kg',
          price: 100,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update a variant', async () => {
      const updateDto = { price: 150 };
      const mockVariant = { id: 'v1', price: 150 };
      mockPrismaService.productVariant.update.mockResolvedValue(mockVariant);

      const result = await service.update('v1', updateDto);

      expect(result).toEqual(mockVariant);
    });

    it('should throw NotFoundException when variant not found', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });
      mockPrismaService.productVariant.update.mockRejectedValue(error);

      await expect(service.update('non-existent', { price: 100 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException on duplicate SKU', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });
      mockPrismaService.productVariant.update.mockRejectedValue(error);

      await expect(service.update('v1', { sku: 'DUPLICATE' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('softDelete', () => {
    it('should soft delete a variant', async () => {
      const mockVariant = { id: 'v1', deletedAt: new Date() };
      mockPrismaService.productVariant.update.mockResolvedValue(mockVariant);

      const result = await service.softDelete('v1');

      expect(result).toEqual(mockVariant);
      expect(mockPrismaService.productVariant.update).toHaveBeenCalledWith({
        where: { id: 'v1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException when variant not found', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });
      mockPrismaService.productVariant.update.mockRejectedValue(error);

      await expect(service.softDelete('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});