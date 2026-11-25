import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

/**
 * Global a propósito: es infraestructura (como la config), no un feature.
 * Así cada módulo inyecta PrismaService sin reimportarlo.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
