import { z } from 'zod';
import { createListQuerySchema } from './common.js';
import type { MembershipTierRef } from './memberships.js';

export const customerListQuerySchema = createListQuerySchema([
  'lastOrderAt',
  'ordersCount',
  'totalSpent',
  'name',
  'points',
] as const).extend({
  tierId: z.coerce.number().int().positive().optional(),
});

export type CustomerListQuery = z.output<typeof customerListQuerySchema>;

/**
 * Un cliente sale de sus ventas (se identifica por el correo): no hay que cargarlo aparte.
 * Gasto y pedidos cuentan solo ventas no canceladas.
 */
export interface CustomerResponse {
  email: string;
  /** Nombre y teléfono de su última compra. */
  name: string;
  phone: string | null;
  ordersCount: number;
  totalSpent: number;
  firstOrderAt: string;
  lastOrderAt: string;
  tier: MembershipTierRef | null;
  points: number;
}
