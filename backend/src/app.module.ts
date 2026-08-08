import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { AddressesModule } from './addresses/addresses.module';
import { InventoryModule } from './inventory/inventory.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminOrdersModule } from './admin-orders/admin-orders.module';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module';
import { SettingsModule } from './settings/settings.module';
import { ProductImagesModule } from './product-images/product-images.module';
import { AppAuthGuard } from './common/guards/app-auth.guard';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: '.env',
      validate,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        limit: 100,
        ttl: 60_000,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    HealthModule,
    CategoriesModule,
    ProductsModule,
    AddressesModule,
    InventoryModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    AdminOrdersModule,
    AdminAuthModule,
    AdminDashboardModule,
    SettingsModule,
    ProductImagesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AppAuthGuard,
    },
  ],
})
export class AppModule {}