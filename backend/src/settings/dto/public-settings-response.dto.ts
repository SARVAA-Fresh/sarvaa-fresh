import { ApiProperty } from '@nestjs/swagger';

export class PublicBusinessDto {
  @ApiProperty({ required: false }) name?: string;
  @ApiProperty({ required: false }) tagline?: string;
  @ApiProperty({ required: false }) heroHeading?: string;
  @ApiProperty({ required: false }) heroSubtitle?: string;
  @ApiProperty({ required: false }) logoUrl?: string;
  @ApiProperty({ required: false }) faviconUrl?: string;
  @ApiProperty({ required: false }) address?: string;
  @ApiProperty({ required: false }) city?: string;
  @ApiProperty({ required: false }) state?: string;
  @ApiProperty({ required: false }) country?: string;
  @ApiProperty({ required: false }) pincode?: string;
  @ApiProperty({ required: false }) gstNumber?: string;
  @ApiProperty({ required: false }) description?: string;
}

export class PublicContactDto {
  @ApiProperty({ required: false }) phone?: string;
  @ApiProperty({ required: false }) whatsapp?: string;
  @ApiProperty({ required: false }) whatsappChannelUrl?: string;
  @ApiProperty({ required: false }) instagramUrl?: string;
  @ApiProperty({ required: false }) instagramHandle?: string;
  @ApiProperty({ required: false }) deliveryAreaDescription?: string;
  @ApiProperty({ required: false }) supportEmail?: string;
  @ApiProperty({ required: false }) customerCareHours?: string;
}

export class PublicDeliveryDto {
  @ApiProperty({ required: false }) fee?: number;
  @ApiProperty({ required: false }) freeDeliveryThreshold?: number;
  @ApiProperty({ required: false }) minimumOrderValue?: number;
  @ApiProperty({ required: false }) maximumRadius?: number;
  @ApiProperty({ required: false }) estimatedTime?: string;
  @ApiProperty({ required: false }) sameDayEnabled?: boolean;
}

export class PublicPaymentDto {
  @ApiProperty({ required: false }) codEnabled?: boolean;
  @ApiProperty({ type: [String], enum: ['COD'] })
  availableMethods: 'COD'[] = [];
}

export class PublicStoreDto {
  @ApiProperty({ required: false }) openTime?: string;
  @ApiProperty({ required: false }) closeTime?: string;
  @ApiProperty({ required: false }) acceptOrders?: boolean;
  @ApiProperty({ required: false }) storeClosed?: boolean;
  @ApiProperty({ required: false }) holidayMode?: boolean;
  @ApiProperty({ required: false }) maintenanceMode?: boolean;
  @ApiProperty({ required: false }) maintenanceMessage?: string;
}

export class PublicBrandingDto {
  @ApiProperty({ required: false }) themeColor?: string;
  @ApiProperty({ required: false }) accentColor?: string;
}

export class PublicSystemDto {
  @ApiProperty({ required: false }) storeVersion?: string;
  @ApiProperty({ required: false }) environment?: string;
}

export class PublicSettingsResponseDto {
  @ApiProperty({ type: PublicBusinessDto }) business: PublicBusinessDto = {};
  @ApiProperty({ type: PublicContactDto }) contact: PublicContactDto = {};
  @ApiProperty({ type: PublicDeliveryDto }) delivery: PublicDeliveryDto = {};
  @ApiProperty({ type: PublicPaymentDto }) payment: PublicPaymentDto = { availableMethods: [] };
  @ApiProperty({ type: PublicStoreDto }) store: PublicStoreDto = {};
  @ApiProperty({ type: PublicBrandingDto }) branding: PublicBrandingDto = {};
  @ApiProperty({ type: PublicSystemDto }) system: PublicSystemDto = {};
}
