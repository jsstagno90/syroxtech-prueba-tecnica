import { Logger, StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.setGlobalPrefix('api');
  // Detrás del proxy del hosting, para que el rate limit vea la IP real.
  app.set('trust proxy', 1);
  app.enableCors({ origin: config.get('CORS_ORIGINS', { infer: true }), credentials: true });
  // Valida body, query y params contra los schemas de Zod compartidos con el panel.
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.enableShutdownHooks();

  const swagger = new DocumentBuilder()
    .setTitle('Admin Panel API')
    .setDescription('API REST del panel administrativo: categorías, marcas, productos y ventas.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, () => SwaggerModule.createDocument(app, swagger));

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  Logger.log(`API lista en http://localhost:${port}/api (docs en /api/docs)`, 'Bootstrap');
}

await bootstrap();
