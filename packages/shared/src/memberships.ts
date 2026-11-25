import { z } from 'zod';
import { createListQuerySchema, optionalText } from './common.js';

/** Colores disponibles para el distintivo de cada nivel. */
export const TIER_COLORS = ['slate', 'amber', 'zinc', 'yellow', 'sky', 'violet', 'emerald', 'rose'] as const;
export type TierColor = (typeof TIER_COLORS)[number];

export const TIER_COLOR_LABELS: Record<TierColor, string> = {
  slate: 'Gris',
  amber: 'Bronce',
  zinc: 'Plata',
  yellow: 'Oro',
  sky: 'Celeste',
  violet: 'Violeta',
  emerald: 'Verde',
  rose: 'Rosa',
};

const tierObject = z.object({
  name: z.string().trim().min(2, 'Mínimo 2 caracteres').max(40, 'Máximo 40 caracteres'),
  minSpent: z.number({ error: 'Ingresá un monto' }).min(0, 'No puede ser negativo').max(999_999_999),
  pointsMultiplier: z
    .number({ error: 'Ingresá un multiplicador' })
    .min(1, 'Mínimo x1')
    .max(10, 'Máximo x10'),
  benefits: optionalText(300),
  color: z.enum(TIER_COLORS),
});

export const createMembershipTierSchema = tierObject.extend({
  benefits: tierObject.shape.benefits.default(null),
  pointsMultiplier: tierObject.shape.pointsMultiplier.default(1),
  color: tierObject.shape.color.default('slate'),
});
export const updateMembershipTierSchema = tierObject.partial();
export const membershipTierListQuerySchema = createListQuerySchema(['minSpent', 'name'] as const);

export type CreateMembershipTierInput = z.input<typeof createMembershipTierSchema>;
export type CreateMembershipTierDto = z.output<typeof createMembershipTierSchema>;
export type UpdateMembershipTierDto = z.output<typeof updateMembershipTierSchema>;
export type MembershipTierListQuery = z.output<typeof membershipTierListQuerySchema>;

export interface MembershipTierResponse {
  id: number;
  name: string;
  minSpent: number;
  pointsMultiplier: number;
  benefits: string | null;
  color: TierColor;
  /** Clientes que hoy están en este nivel. */
  customersCount: number;
  createdAt: string;
  updatedAt: string;
}

export type MembershipTierRef = Pick<MembershipTierResponse, 'id' | 'name' | 'color' | 'pointsMultiplier'>;

/** El nivel que corresponde a un gasto: el de mayor mínimo que el cliente ya alcanzó. */
export function resolveTier<T extends { minSpent: number }>(spent: number, tiers: readonly T[]): T | null {
  return [...tiers].sort((a, b) => b.minSpent - a.minSpent).find((tier) => spent >= tier.minSpent) ?? null;
}
