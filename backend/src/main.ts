import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const apiPrefix = configService.get<string>('API_PREFIX', '/api/v1');

  app.setGlobalPrefix(apiPrefix);

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
    origin: true,
    credentials: true,
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
  app.useStaticAssets(join(process.cwd(), uploadLocalPath), {
    prefix: uploadLocalUrlPrefix,
  });

  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}${apiPrefix}`);
  console.log(`Swagger documentation: ${await app.getUrl()}/api/docs`);
}

bootstrap();