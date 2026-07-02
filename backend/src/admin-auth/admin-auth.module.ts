import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'admin-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret:
  configService.get<string>('ADMIN_JWT_SECRET') ??
  configService.get<string>('JWT_SECRET') ??
  'change-me',
        signOptions: {
          expiresIn:
          configService.get<string>('ADMIN_JWT_EXPIRES_IN') ??
          configService.get<string>('JWT_EXPIRES_IN') ??
          '7d',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminJwtStrategy],
  exports: [AdminAuthService],
})
export class AdminAuthModule {}
