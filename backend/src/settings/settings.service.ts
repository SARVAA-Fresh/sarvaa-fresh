import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { SettingQueryDto } from './dto/setting-query.dto';
import {
  PublicBusinessDto,
  PublicContactDto,
  PublicDeliveryDto,
  PublicPaymentDto,
  PublicSettingsResponseDto,
  PublicStoreDto,
} from './dto/public-settings-response.dto';
import { Setting, SettingCategory, SettingType, Prisma } from '@prisma/client';

type ParsedValue = string | number | boolean | unknown;

const PUBLIC_KEY_MAP: Record<string, string> = {
  'business.name': 'business.name',
  'business.logo_url': 'business.logoUrl',
  'business.address': 'business.address',
  'business.city': 'business.city',
  'business.state': 'business.state',
  'business.country': 'business.country',
  'business.pincode': 'business.pincode',
  'business.gst_number': 'business.gstNumber',
  'business.description': 'business.description',
  'contact.phone': 'contact.phone',
  'contact.whatsapp': 'contact.whatsapp',
  'contact.support_email': 'contact.supportEmail',
  'contact.customer_care_hours': 'contact.customerCareHours',
  'delivery.fee': 'delivery.fee',
  'delivery.free_delivery_threshold': 'delivery.freeDeliveryThreshold',
  'delivery.minimum_order_value': 'delivery.minimumOrderValue',
  'delivery.maximum_radius': 'delivery.maximumRadius',
  'delivery.estimated_time': 'delivery.estimatedTime',
  'delivery.same_day_enabled': 'delivery.sameDayEnabled',
  'payment.upi_id': 'payment.upiId',
  'payment.upi_display_name': 'payment.upiDisplayName',
  'payment.qr_image_url': 'payment.qrImageUrl',
  'payment.bank_name': 'payment.bankName',
  'payment.account_holder_name': 'payment.accountHolderName',
  'payment.branch': 'payment.branch',
  'payment.ifsc': 'payment.ifsc',
  'payment.cod_enabled': 'payment.codEnabled',
  'payment.upi_enabled': 'payment.upiEnabled',
  'payment.future_gateway_enabled': 'payment.futureGatewayEnabled',
  'store.open_time': 'store.openTime',
  'store.close_time': 'store.closeTime',
  'store.accept_orders': 'store.acceptOrders',
  'store.maintenance_mode': 'store.maintenanceMode',
  'store.maintenance_message': 'store.maintenanceMessage',
};

interface SeedRow {
  key: string;
  value: string;
  type: SettingType;
  category: SettingCategory;
  description?: string;
  isEditable?: boolean;
  isPublic?: boolean;
}

const SEED_SETTINGS: SeedRow[] = [
  { key: 'business.name', value: '', type: SettingType.STRING, category: SettingCategory.BUSINESS, isPublic: true },
  { key: 'business.logo_url', value: '', type: SettingType.STRING, category: SettingCategory.BUSINESS, isPublic: true },
  { key: 'business.address', value: '', type: SettingType.STRING, category: SettingCategory.BUSINESS, isPublic: true },
  { key: 'business.city', value: '', type: SettingType.STRING, category: SettingCategory.BUSINESS, isPublic: true },
  { key: 'business.state', value: '', type: SettingType.STRING, category: SettingCategory.BUSINESS, isPublic: true },
  { key: 'business.country', value: '', type: SettingType.STRING, category: SettingCategory.BUSINESS, isPublic: true },
  { key: 'business.pincode', value: '', type: SettingType.STRING, category: SettingCategory.BUSINESS, isPublic: true },
  { key: 'business.gst_number', value: '', type: SettingType.STRING, category: SettingCategory.BUSINESS, isPublic: true },
  { key: 'business.description', value: '', type: SettingType.STRING, category: SettingCategory.BUSINESS, isPublic: true },
  { key: 'contact.phone', value: '', type: SettingType.STRING, category: SettingCategory.CONTACT, isPublic: true },
  { key: 'contact.whatsapp', value: '', type: SettingType.STRING, category: SettingCategory.CONTACT, isPublic: true },
  { key: 'contact.support_email', value: '', type: SettingType.STRING, category: SettingCategory.CONTACT, isPublic: true },
  { key: 'contact.customer_care_hours', value: '', type: SettingType.STRING, category: SettingCategory.CONTACT, isPublic: true },
  { key: 'delivery.fee', value: '0', type: SettingType.NUMBER, category: SettingCategory.DELIVERY, isPublic: true },
  { key: 'delivery.free_delivery_threshold', value: '0', type: SettingType.NUMBER, category: SettingCategory.DELIVERY, isPublic: true },
  { key: 'delivery.minimum_order_value', value: '0', type: SettingType.NUMBER, category: SettingCategory.DELIVERY, isPublic: true },
  { key: 'delivery.maximum_radius', value: '0', type: SettingType.NUMBER, category: SettingCategory.DELIVERY, isPublic: true },
  { key: 'delivery.estimated_time', value: '', type: SettingType.STRING, category: SettingCategory.DELIVERY, isPublic: true },
  { key: 'delivery.same_day_enabled', value: 'false', type: SettingType.BOOLEAN, category: SettingCategory.DELIVERY, isPublic: true },
  { key: 'payment.upi_id', value: '', type: SettingType.STRING, category: SettingCategory.PAYMENT, isPublic: true },
  { key: 'payment.upi_display_name', value: '', type: SettingType.STRING, category: SettingCategory.PAYMENT, isPublic: true },
  { key: 'payment.qr_image_url', value: '', type: SettingType.STRING, category: SettingCategory.PAYMENT, isPublic: true },
  { key: 'payment.bank_name', value: '', type: SettingType.STRING, category: SettingCategory.PAYMENT, isPublic: true },
  { key: 'payment.account_holder_name', value: '', type: SettingType.STRING, category: SettingCategory.PAYMENT, isPublic: true },
  { key: 'payment.branch', value: '', type: SettingType.STRING, category: SettingCategory.PAYMENT, isPublic: true },
  { key: 'payment.ifsc', value: '', type: SettingType.STRING, category: SettingCategory.PAYMENT, isPublic: true },
  { key: 'payment.cod_enabled', value: 'false', type: SettingType.BOOLEAN, category: SettingCategory.PAYMENT, isPublic: true },
  { key: 'payment.upi_enabled', value: 'false', type: SettingType.BOOLEAN, category: SettingCategory.PAYMENT, isPublic: true },
  { key: 'payment.future_gateway_enabled', value: 'false', type: SettingType.BOOLEAN, category: SettingCategory.PAYMENT, isPublic: true },
  { key: 'store.open_time', value: '', type: SettingType.STRING, category: SettingCategory.STORE, isPublic: true },
  { key: 'store.close_time', value: '', type: SettingType.STRING, category: SettingCategory.STORE, isPublic: true },
  { key: 'store.accept_orders', value: 'true', type: SettingType.BOOLEAN, category: SettingCategory.STORE, isPublic: true },
  { key: 'store.maintenance_mode', value: 'false', type: SettingType.BOOLEAN, category: SettingCategory.STORE, isPublic: true },
  { key: 'store.maintenance_message', value: '', type: SettingType.STRING, category: SettingCategory.STORE, isPublic: true },
];

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    try {
      const count = await this.prisma.setting.count();
      if (count === 0) {
        this.logger.log('Seeding default settings...');
        await this.prisma.setting.createMany({
          data: SEED_SETTINGS.map((s) => ({
            key: s.key,
            value: s.value,
            type: s.type,
            category: s.category,
            description: s.description,
            isEditable: s.isEditable ?? true,
            isPublic: s.isPublic ?? false,
          })),
        });
        this.logger.log(`Seeded ${SEED_SETTINGS.length} default settings`);
      }
    } catch (error) {
      this.logger.warn(
        `Could not seed default settings: ${(error as Error).message}`,
      );
    }
  }

  parseValue(setting: Pick<Setting, 'value' | 'type'>): ParsedValue {
    const { value, type } = setting;
    switch (type) {
      case SettingType.STRING:
        return value;
      case SettingType.NUMBER: {
        const n = Number(value);
        if (Number.isNaN(n)) {
          this.logger.warn(`Invalid NUMBER setting value: ${value}`);
          return 0;
        }
        return n;
      }
      case SettingType.BOOLEAN:
        return value.toLowerCase() === 'true';
      case SettingType.JSON: {
        try {
          return JSON.parse(value);
        } catch (e) {
          this.logger.warn(`Invalid JSON setting value: ${value}`);
          return value;
        }
      }
      default:
        return value;
    }
  }

  async findAllPublic(): Promise<PublicSettingsResponseDto> {
    const rows = await this.prisma.setting.findMany({
      where: { isPublic: true, deletedAt: null },
    });

    const response = new PublicSettingsResponseDto();
    response.business = new PublicBusinessDto();
    response.contact = new PublicContactDto();
    response.delivery = new PublicDeliveryDto();
    response.payment = new PublicPaymentDto();
    response.payment.availableMethods = [];
    response.store = new PublicStoreDto();

    for (const row of rows) {
      const field = PUBLIC_KEY_MAP[row.key];
      if (!field) continue;
      const [group, prop] = field.split('.');
      const parsed = this.parseValue(row);
      const target = (response as unknown as Record<string, Record<string, unknown>>)[group];
      if (target) {
        target[prop] = parsed as unknown;
      }
    }

    if (response.payment.codEnabled === true) {
      response.payment.availableMethods.push('COD');
    }
    if (response.payment.upiEnabled === true) {
      response.payment.availableMethods.push('UPI');
    }

    return response;
  }

  async findAllAdmin(query: SettingQueryDto): Promise<{
    items: Setting[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SettingWhereInput = { deletedAt: null };
    if (query.category) where.category = query.category;
    if (query.isPublic !== undefined) where.isPublic = query.isPublic;
    if (query.search) {
      where.OR = [
        { key: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.setting.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ category: 'asc' }, { key: 'asc' }],
      }),
      this.prisma.setting.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<Setting> {
    const setting = await this.prisma.setting.findFirst({
      where: { id, deletedAt: null },
    });
    if (!setting) throw new NotFoundException('Setting not found');
    return setting;
  }

  async create(dto: CreateSettingDto): Promise<Setting> {
    const data = { ...dto } as Prisma.SettingUncheckedCreateInput;
    if (data.type === SettingType.BOOLEAN && typeof data.value === 'string') {
      data.value = data.value.toLowerCase();
    }
    try {
      return await this.prisma.setting.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Setting with this key already exists');
        }
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateSettingDto): Promise<Setting> {
    const data: Prisma.SettingUpdateInput = {};
    if (dto.key !== undefined) data.key = dto.key;
    if (dto.value !== undefined) {
      data.value =
        dto.type === SettingType.BOOLEAN ? dto.value.toLowerCase() : dto.value;
    }
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.isEditable !== undefined) data.isEditable = dto.isEditable;
    if (dto.isPublic !== undefined) data.isPublic = dto.isPublic;

    try {
      return await this.prisma.setting.update({ where: { id }, data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Setting not found');
        }
        if (error.code === 'P2002') {
          throw new ConflictException('Setting with this key already exists');
        }
      }
      throw error;
    }
  }

  async softDelete(id: string): Promise<Setting> {
    try {
      return await this.prisma.setting.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Setting not found');
      }
      throw error;
    }
  }
}
