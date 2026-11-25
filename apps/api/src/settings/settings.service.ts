import { Injectable } from '@nestjs/common';
import type { LoyaltySettingsDto, StoreSettingsDto, StoreSettingsResponse } from '@admin/shared';
import type { StoreSettings } from '../generated/prisma/client.js';
import { toNumber } from '../common/http/decimal.js';
import { PrismaService } from '../prisma/prisma.service.js';

const SETTINGS_ID = 1;

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Una sola fila: si todavía no existe se crea con valores por defecto. */
  async get(): Promise<StoreSettingsResponse> {
    const row = await this.prisma.storeSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, storeName: 'Mi tienda' },
      update: {},
    });
    return toSettingsResponse(row);
  }

  async update(dto: StoreSettingsDto | LoyaltySettingsDto): Promise<StoreSettingsResponse> {
    await this.get();
    return toSettingsResponse(await this.prisma.storeSettings.update({ where: { id: SETTINGS_ID }, data: dto }));
  }
}

function toSettingsResponse(row: StoreSettings): StoreSettingsResponse {
  return {
    storeName: row.storeName,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    address: row.address,
    loyaltyEnabled: row.loyaltyEnabled,
    amountPerPoint: toNumber(row.amountPerPoint),
    updatedAt: row.updatedAt.toISOString(),
  };
}
