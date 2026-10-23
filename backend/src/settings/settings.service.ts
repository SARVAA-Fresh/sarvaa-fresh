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
  PublicBrandingDto,
  PublicContactDto,
  PublicDeliveryDto,
  PublicPaymentDto,
  PublicSettingsResponseDto,
  PublicStoreDto,
  PublicSystemDto,
} from './dto/public-settings-response.dto';
import { Setting, SettingCategory, SettingType, Prisma } from '@prisma/client';

type ParsedValue = string | number | boolean | unknown;

const PUBLIC_KEY_MAP: Record<string, string> = {
  'business.name': 'business.name',
  'business.tagline': 'business.tagline',
  'business.hero_heading': 'business.heroHeading',
  'business.hero_subtitle': 'business.heroSubtitle',
  'business.logo_url': 'business.logoUrl',
  'business.favicon_url': 'business.faviconUrl',
  'business.address': 'business.address',
  'business.city': 'business.city',
  'business.state': 'business.state',
  'business.country': 'business.country',
  'business.pincode': 'business.pincode',
  'business.gst_number': 'business.gstNumber',
  'business.description': 'business.description',
  'contact.phone': 'contact.phone',
  'contact.whatsapp': 'contact.whatsapp',
  'contact.whatsapp_channel_url': 'contact.whatsappChannelUrl',
  'contact.instagram_url': 'contact.instagramUrl',
  'contact.instagram_handle': 'contact.instagramHandle',
  'contact.delivery_area_description': 'contact.deliveryAreaDescription',
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
  'payment.instructions': 'payment.instructions',
  'store.open_time': 'store.openTime',
  'store.close_time': 'store.closeTime',
  'store.accept_orders': 'store.acceptOrders',
  'store.closed': 'store.storeClosed',
  'store.holiday_mode': 'store.holidayMode',
  'store.maintenance_mode': 'store.maintenanceMode',
  'store.maintenance_message': 'store.maintenanceMessage',
  'branding.theme_color': 'branding.themeColor',
  'branding.accent_color': 'branding.accentColor',
  'system.store_version': 'system.storeVersion',
  'system.environment': 'system.environment',
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
  { key: 'business.name', value: 'SARVAA Fresh', type: SettingType.STRING, category: SettingCategory.BUSINESS, isPublic: true },
  { key: 'business.tagline', value: 'Fresh Fruits & Vegetables', type: SettingType.STRING, category: SettingCategory.BUSINESS, isPublic: true },
  { key: 'business.hero_heading', value: 'Fresh Fruits & Vegetables Delivered Across Sagwara', type: SettingType.STRING, category: SettingCategory.BUSINESS, isPublic: true },
  { key: 'business.hero_subtitle', value: 'Handpicked every morning. Freshness guaranteed. Delivered with care from your trusted local store.', type: SettingType.STRING, category: SettingCategory.BUSINESS, isPublic: true },
  { key: 'business.logo_url', value: '/brand/logo.png', type: SettingType.STRING, category: SettingCategory.BUSINESS, isPublic: true },
  { key: 'business.favicon_url', value: '/brand/icon.png', type: SettingType.STRING, category: SettingCategory.BUSINESS, isPublic: true },
  { key: 'business.address', value: '', type: SettingType.STRING, category: SettingCategory.BUSINESS, isPublic: true },
  { key: 'business.city', value: 'Sagwara', type: SettingType.STRING, category: SettingCategory.BUSINESS, isPublic: true },
  { key: 'business.state', value: 'Rajasthan', type: SettingType.STRING, category: SettingCategory.BUSINESS, isPublic: true },
  { key: 'business.country', value: 'India', type: SettingType.STRING, category: SettingCategory.BUSINESS, isPublic: true },
  { key: 'business.pincode', value: '', type: SettingType.STRING, category: SettingCategory.BUSINESS, isPublic: true },
  { key: 'business.gst_number', value: '', type: SettingType.STRING, category: SettingCategory.BUSINESS, isPublic: true },
  { key: 'business.description', value: '', type: SettingType.STRING, category: SettingCategory.BUSINESS, isPublic: true },
  { key: 'contact.phone', value: '', type: SettingType.STRING, category: SettingCategory.CONTACT, isPublic: true },
  { key: 'contact.whatsapp', value: '', type: SettingType.STRING, category: SettingCategory.CONTACT, isPublic: true },
  { key: 'contact.whatsapp_channel_url', value: 'https://whatsapp.com/channel/0029VbCoSLnFy72B3UiivC1k', type: SettingType.STRING, category: SettingCategory.CONTACT, isPublic: true },
  { key: 'contact.instagram_url', value: 'https://www.instagram.com/sarvaafresh/', type: SettingType.STRING, category: SettingCategory.CONTACT, isPublic: true },
  { key: 'contact.instagram_handle', value: '@sarvaafresh', type: SettingType.STRING, category: SettingCategory.CONTACT, isPublic: true },
  { key: 'contact.delivery_area_description', value: 'Sagwara, Rajasthan', type: SettingType.STRING, category: SettingCategory.CONTACT, isPublic: true },
  { key: 'contact.support_email', value: '', type: SettingType.STRING, category: SettingCategory.CONTACT, isPublic: true },
  { key: 'contact.customer_care_hours', value: '', type: SettingType.STRING, category: SettingCategory.CONTACT, isPublic: true },
  { key: 'delivery.fee', value: '20', type: SettingType.NUMBER, category: SettingCategory.DELIVERY, isPublic: true },
  { key: 'delivery.free_delivery_threshold', value: '200', type: SettingType.NUMBER, category: SettingCategory.DELIVERY, isPublic: true },
  { key: 'delivery.minimum_order_value', value: '80', type: SettingType.NUMBER, category: SettingCategory.DELIVERY, isPublic: true },
  { key: 'delivery.maximum_radius', value: '10', type: SettingType.NUMBER, category: SettingCategory.DELIVERY, isPublic: true },
  { key: 'delivery.estimated_time', value: '30-60 Minutes', type: SettingType.STRING, category: SettingCategory.DELIVERY, isPublic: true },
  { key: 'delivery.same_day_enabled', value: 'true', type: SettingType.BOOLEAN, category: SettingCategory.DELIVERY, isPublic: true },
  { key: 'payment.upi_id', value: '', type: SettingType.STRING, category: SettingCategory.PAYMENT, isPublic: true },
  { key: 'payment.upi_display_name', value: '', type: SettingType.STRING, category: SettingCategory.PAYMENT, isPublic: true },
  { key: 'payment.qr_image_url', value: '', type: SettingType.STRING, category: SettingCategory.PAYMENT, isPublic: true },
  { key: 'payment.bank_name', value: '', type: SettingType.STRING, category: SettingCategory.PAYMENT, isPublic: true },
  { key: 'payment.account_holder_name', value: '', type: SettingType.STRING, category: SettingCategory.PAYMENT, isPublic: true },
  { key: 'payment.branch', value: '', type: SettingType.STRING, category: SettingCategory.PAYMENT, isPublic: true },
  { key: 'payment.ifsc', value: '', type: SettingType.STRING, category: SettingCategory.PAYMENT, isPublic: true },
  { key: 'payment.cod_enabled', value: 'true', type: SettingType.BOOLEAN, category: SettingCategory.PAYMENT, isPublic: true },
  { key: 'payment.upi_enabled', value: 'false', type: SettingType.BOOLEAN, category: SettingCategory.PAYMENT, isPublic: true },
  { key: 'payment.future_gateway_enabled', value: 'false', type: SettingType.BOOLEAN, category: SettingCategory.PAYMENT, isPublic: true },
  { key: 'payment.instructions', value: 'Pay with UPI and upload payment proof for verification.', type: SettingType.STRING, category: SettingCategory.PAYMENT, isPublic: true },
  { key: 'store.open_time', value: '06:00', type: SettingType.STRING, category: SettingCategory.STORE, isPublic: true },
  { key: 'store.close_time', value: '21:00', type: SettingType.STRING, category: SettingCategory.STORE, isPublic: true },
  { key: 'store.accept_orders', value: 'true', type: SettingType.BOOLEAN, category: SettingCategory.STORE, isPublic: true },
  { key: 'store.closed', value: 'false', type: SettingType.BOOLEAN, category: SettingCategory.STORE, isPublic: true },
  { key: 'store.holiday_mode', value: 'false', type: SettingType.BOOLEAN, category: SettingCategory.STORE, isPublic: true },
  { key: 'store.maintenance_mode', value: 'false', type: SettingType.BOOLEAN, category: SettingCategory.STORE, isPublic: true },
  { key: 'store.maintenance_message', value: '', type: SettingType.STRING, category: SettingCategory.STORE, isPublic: true },
  { key: 'branding.theme_color', value: '#14532d', type: SettingType.STRING, category: SettingCategory.STORE, isPublic: true },
  { key: 'branding.accent_color', value: '#4CAF50', type: SettingType.STRING, category: SettingCategory.STORE, isPublic: true },
  { key: 'system.store_version', value: 'MVP', type: SettingType.STRING, category: SettingCategory.SYSTEM, isPublic: true },
  { key: 'system.environment', value: 'development', type: SettingType.STRING, category: SettingCategory.SYSTEM, isPublic: false },
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
    response.branding = new PublicBrandingDto();
    response.system = new PublicSystemDto();

    for (const row of rows) {
      const field = PUBLIC_KEY_MAP[row.key];
      if (!field) continue;
      const [group, prop] = field.split('.');
      if (group === 'payment' && prop !== 'codEnabled') continue;
      const parsed = this.parseValue(row);
      const target = (response as unknown as Record<string, Record<string, unknown>>)[group];
      if (target) {
        target[prop] = parsed as unknown;
      }
    }

    if (response.payment.codEnabled === true) {
      response.payment.availableMethods.push('COD');
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
