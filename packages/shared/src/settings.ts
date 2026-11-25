import { z } from 'zod';
import { optionalText } from './common.js';

export const storeSettingsSchema = z.object({
  storeName: z.string().trim().min(2, 'Mínimo 2 caracteres').max(60, 'Máximo 60 caracteres'),
  contactEmail: z
    .union([z.email('Ingresá un correo válido').trim().toLowerCase(), z.literal('')])
    .transform((value) => value || null)
    .nullable(),
  contactPhone: optionalText(30),
  address: optionalText(200),
});

export const loyaltySettingsSchema = z.object({
  loyaltyEnabled: z.boolean(),
  amountPerPoint: z
    .number({ error: 'Ingresá un monto' })
    .positive('Tiene que ser mayor a 0')
    .max(10_000_000, 'Monto demasiado alto'),
});

export type StoreSettingsInput = z.input<typeof storeSettingsSchema>;
export type StoreSettingsDto = z.output<typeof storeSettingsSchema>;
export type LoyaltySettingsInput = z.input<typeof loyaltySettingsSchema>;
export type LoyaltySettingsDto = z.output<typeof loyaltySettingsSchema>;

export interface StoreSettingsResponse {
  storeName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  loyaltyEnabled: boolean;
  amountPerPoint: number;
  updatedAt: string;
}

/** Puntos de un cliente: 1 cada `amountPerPoint` gastados, multiplicado por su nivel de membresía. */
export function calculatePoints(spent: number, amountPerPoint: number, multiplier = 1): number {
  if (amountPerPoint <= 0) return 0;
  return Math.floor((spent / amountPerPoint) * multiplier);
}

export interface LoyaltySummary {
  settings: Pick<StoreSettingsResponse, 'loyaltyEnabled' | 'amountPerPoint'>;
  /** Puntos acumulados por todos los clientes. */
  totalPoints: number;
  customersWithPoints: number;
}
