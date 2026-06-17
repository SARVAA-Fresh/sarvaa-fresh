import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('ProductsService', () => {
  let service: ProductsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    product: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prismaService = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const mockProducts = [
        { id: '1', name: 'Product 1', slug: 'product-1', categoryId: 'cat-1' },
        { id: '2', name: 'Product 2', slug: 'product-2', categoryId: 'cat-1' },
      ];

      mockPrismaService.$transaction.mockResolvedValue([mockProducts, 2]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result).toEqual({
        items: mockProducts,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should filter by categoryId', async () => {
      mockPrismaService.$transaction.mockResolvedValue([[], 0]);

      await service.findAll({ categoryId: 'cat-123' });

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a product by id', async () => {
      const mockProduct = { id: '1', name: 'Product 1', slug: 'product-1' };
      mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);

      const result = await service.findById('1');

      expect(result).toEqual(mockProduct);
      expect(mockPrismaService.product.findFirst).toHaveBeenCalledWith({
        where: { id: '1', deletedAt: null },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when product not found', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySlug', () => {
    it('should return a product by slug', async () => {
      const mockProduct = { id: '1', name: 'Product 1', slug: 'product-1' };
      mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);

      const result = await service.findBySlug('product-1');

      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(null);

      await expect(service.findBySlug('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a product without variants', async () => {
      const createDto = {
        categoryId: 'cat-1',
        name: 'New Product',
        slug: 'new-product',
      };
      const mockProduct = { id: '1', ...createDto };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          product: {
            create: jest.fn().mockResolvedValue(mockProduct),
            findUnique: jest.fn().mockResolvedValue(mockProduct),
          },
        };
        return callback(tx);
      });

      const result = await service.create(createDto);

      expect(result).toEqual(mockProduct);
    });

    it('should create a product with inline variants', async () => {
      const createDto = {
        categoryId: 'cat-1',
        name: 'New Product',
        slug: 'new-product',
        variants: [
          {
            sku: 'SKU-1',
            variantName: 'Variant 1',
            unit: 'kg',
            price: 100,
            isDefault: true,
          },
        ],
      };
      const mockProduct = { id: '1', ...createDto };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          product: {
            create: jest.fn().mockResolvedValue(mockProduct),
            findUnique: jest.fn().mockResolvedValue({ ...mockProduct, variants: [] }),
          },
          productVariant: {
            create: jest.fn().mockResolvedValue({ id: 'v1', ...createDto.variants[0] }),
          },
          inventory: {
            create: jest.fn().mockResolvedValue({ id: 'i1' }),
          },
        };
        return callback(tx);
      });

      const result = await service.create(createDto);

      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      const updateDto = { name: 'Updated Product' };
      const mockProduct = { id: '1', name: 'Updated Product' };
      mockPrismaService.product.update.mockResolvedValue(mockProduct);

      const result = await service.update('1', updateDto);

      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });
      mockPrismaService.product.update.mockRejectedValue(error);

      await expect(service.update('non-existent', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('softDelete', () => {
    it('should soft delete a product and its variants', async () => {
      const mockProduct = { id: '1', deletedAt: new Date() };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          product: {
            update: jest.fn().mockResolvedValue(mockProduct),
          },
          productVariant: {
            updateMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
        };
        return callback(tx);
      });

      const result = await service.softDelete('1');

      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          product: {
            update: jest.fn().mockRejectedValue(error),
          },
          productVariant: {
            updateMany: jest.fn(),
          },
        };
        return callback(tx);
      });

      await expect(service.softDelete('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});