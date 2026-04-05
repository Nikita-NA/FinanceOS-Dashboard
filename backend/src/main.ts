import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition'],
  });

  const config = new DocumentBuilder()
    .setTitle('Finance Dashboard API')
    .setDescription(
      `## Overview\nA role-based finance dashboard backend built with NestJS + PostgreSQL.\n\n## Roles & Permissions\n| Role | View Records | Create/Update | Delete | User Mgmt | Analytics |\n|------|-------------|---------------|--------|-----------|----------|\n| VIEWER | ✅ | ❌ | ❌ | ❌ | Summary only |\n| ANALYST | ✅ | ✅ (own only) | ❌ | ❌ | ✅ |\n| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ |\n\n## Authentication\nAll endpoints except register and login require a Bearer JWT token.\n\`Authorization: Bearer <your_token>\``
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Info', 'API information')
    .addTag('Auth', 'Authentication & profile')
    .addTag('Users', 'User management (Admin only)')
    .addTag('Transactions', 'Financial record management')
    .addTag('Dashboard', 'Analytics and summary data')
    .addTag('Audit', 'Admin audit trail')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`\n🚀 Finance Backend running on: http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger Docs:  http://localhost:${port}/api/docs\n`);
}

bootstrap();
