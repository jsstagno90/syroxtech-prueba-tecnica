import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module.js';
import { BrandsModule } from './brands/brands.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter.js';
import { validateEnv } from './config/env.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { HealthController } from './health/health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProductsModule } from './products/products.module.js';
import { SalesModule } from './sales/sales.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Límite general por IP; el login tiene uno más estricto.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    PrismaModule,
    AuthModule,
    CategoriesModule,
    BrandsModule,
    ProductsModule,
    SalesModule,
    DashboardModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
