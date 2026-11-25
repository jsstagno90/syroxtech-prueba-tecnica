import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  loyaltySettingsSchema,
  storeSettingsSchema,
  type LoyaltySettingsDto,
  type StoreSettingsDto,
} from '@admin/shared';
import { SettingsService } from './settings.service.js';

@ApiTags('Configuración')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get() {
    return this.settings.get();
  }

  @Patch()
  @ApiOperation({ summary: 'Datos de la tienda (nombre y contacto)' })
  update(@Body({ schema: storeSettingsSchema }) body: StoreSettingsDto) {
    return this.settings.update(body);
  }

  @Patch('loyalty')
  @ApiOperation({ summary: 'Programa de puntos: activarlo y cuántos pesos vale cada punto' })
  updateLoyalty(@Body({ schema: loyaltySettingsSchema }) body: LoyaltySettingsDto) {
    return this.settings.update(body);
  }
}
