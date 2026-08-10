import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import {
  normalizeLocalUploadUrlPrefix,
  resolveLocalUploadDir,
} from './storage/utils/local-upload-paths';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);



  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const apiPrefix = configService.get<string>('API_PREFIX', '/api/v1');
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const corsOrigins = (configService.get<string>('CORS_ALLOWED_ORIGINS', '') || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const defaultOrigins = (nodeEnv === 'production'
    ? [configService.get<string>('FRONTEND_URL'), configService.get<string>('NEXT_PUBLIC_APP_URL')]
    : [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
        configService.get<string>('FRONTEND_URL'),
        configService.get<string>('NEXT_PUBLIC_APP_URL'),
      ])
    .filter((origin): origin is string => Boolean(origin));
  const allowedOrigins = [...new Set([...defaultOrigins, ...corsOrigins])];

  app.setGlobalPrefix(apiPrefix);
  app.use(
    helmet({
      xPoweredBy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: 'sameorigin' },
      contentSecurityPolicy: false,
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalInterceptors(new TransformInterceptor());

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'x-api-key'],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SARVAA Fresh API')
    .setDescription('Hyperlocal commerce API for fresh produce delivery')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token',
      },
      'Bearer-auth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
      },
      'Api-key-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  app.enableShutdownHooks();

  // Serve uploaded files statically. Values are sourced from config with
  // sensible defaults so the app still boots when env vars are missing.
  const uploadLocalPath = configService.get<string>('UPLOAD_LOCAL_PATH', './uploads');
  const uploadLocalUrlPrefix =
    configService.get<string>('UPLOAD_LOCAL_URL_PREFIX', '/uploads');
  app.useStaticAssets(resolveLocalUploadDir(uploadLocalPath), {
    prefix: normalizeLocalUploadUrlPrefix(uploadLocalUrlPrefix),
  });

 await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}${apiPrefix}`);
  console.log(`Swagger documentation: ${await app.getUrl()}/api/docs`);
}

bootstrap();
