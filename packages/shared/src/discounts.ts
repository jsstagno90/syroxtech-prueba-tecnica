import { z } from 'zod';
import { createListQuerySchema, optionalText } from './common.js';

export const DISCOUNT_TYPES = ['PERCENTAGE', 'FIXED'] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  PERCENTAGE: 'Porcentaje',
  FIXED: 'Monto fijo',
};

export const DISCOUNT_STATUSES = ['ACTIVE', 'SCHEDULED', 'EXPIRED', 'EXHAUSTED', 'INACTIVE'] as const;
export type DiscountStatus = (typeof DISCOUNT_STATUSES)[number];

export const DISCOUNT_STATUS_LABELS: Record<DiscountStatus, string> = {
  ACTIVE: 'Vigente',
  SCHEDULED: 'Programado',
  EXPIRED: 'Vencido',
  EXHAUSTED: 'Agotado',
  INACTIVE: 'Pausado',
};

/** Fecha de un input type="date" (YYYY-MM-DD), o null si se dejó vacía. */
const optionalDate = z
  .union([z.iso.date('Fecha inválida'), z.literal('')])
  .transform((value) => value || null)
  .nullable();

const discountObject = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,20}$/, 'De 3 a 20 caracteres: letras, números, guion o guion bajo'),
  description: optionalText(200),
  type: z.enum(DISCOUNT_TYPES, { error: 'Elegí el tipo de descuento' }),
  value: z.number({ error: 'Ingresá el valor' }).positive('Tiene que ser mayor a 0').max(99_999_999),
  minPurchase: z.number().positive('Tiene que ser mayor a 0').max(99_999_999).nullable(),
  usageLimit: z.number().int('Tiene que ser un número entero').positive('Tiene que ser mayor a 0').nullable(),
  startsAt: optionalDate,
  endsAt: optionalDate,
  isActive: z.boolean(),
});

type DiscountShape = Partial<z.output<typeof discountObject>>;

function validateDiscount(data: DiscountShape, ctx: z.RefinementCtx) {
  if (data.type === 'PERCENTAGE' && data.value !== undefined && data.value > 100) {
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'Un porcentaje no puede superar 100' });
  }
  if (data.startsAt && data.endsAt && data.endsAt < data.startsAt) {
    ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'Tiene que ser posterior al inicio' });
  }
}

export const createDiscountSchema = discountObject
  .extend({
    description: discountObject.shape.description.default(null),
    minPurchase: discountObject.shape.minPurchase.default(null),
    usageLimit: discountObject.shape.usageLimit.default(null),
    startsAt: optionalDate.default(null),
    endsAt: optionalDate.default(null),
    isActive: z.boolean().default(true),
  })
  .superRefine(validateDiscount);

export const updateDiscountSchema = discountObject.partial().superRefine(validateDiscount);

export const discountListQuerySchema = createListQuerySchema(['code', 'createdAt', 'endsAt'] as const).extend({
  status: z.enum(DISCOUNT_STATUSES).optional(),
});

export type CreateDiscountInput = z.input<typeof createDiscountSchema>;
export type CreateDiscountDto = z.output<typeof createDiscountSchema>;
export type UpdateDiscountDto = z.output<typeof updateDiscountSchema>;
export type DiscountListQuery = z.output<typeof discountListQuerySchema>;

export interface DiscountResponse {
  id: number;
  code: string;
  description: string | null;
  type: DiscountType;
  value: number;
  minPurchase: number | null;
  usageLimit: number | null;
  /** Ventas no canceladas que usaron el cupón. */
  usedCount: number;
  /** YYYY-MM-DD */
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  status: DiscountStatus;
  createdAt: string;
  updatedAt: string;
}

/** Cupones vigentes, para el selector de "Generar venta". */
export type DiscountOption = Pick<DiscountResponse, 'id' | 'code' | 'description' | 'type' | 'value' | 'minPurchase'>;

/* ------------------------------ Reglas ------------------------------ */

/** Fecha de hoy en la zona de la tienda (YYYY-MM-DD). */
export function todayInStore(now = new Date(), timeZone = 'America/Argentina/Buenos_Aires'): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** En qué estado está un cupón hoy. Lo usan la API (para validar) y el panel (para mostrarlo). */
export function getDiscountStatus(
  discount: Pick<DiscountResponse, 'isActive' | 'startsAt' | 'endsAt' | 'usageLimit' | 'usedCount'>,
  today = todayInStore(),
): DiscountStatus {
  if (!discount.isActive) return 'INACTIVE';
  if (discount.endsAt && discount.endsAt < today) return 'EXPIRED';
  if (discount.startsAt && discount.startsAt > today) return 'SCHEDULED';
  if (discount.usageLimit !== null && discount.usedCount >= discount.usageLimit) return 'EXHAUSTED';
  return 'ACTIVE';
}

/** Monto a descontar sobre un subtotal, en centavos para no arrastrar errores de redondeo. */
export function calculateDiscountAmount(subtotal: number, discount: Pick<DiscountResponse, 'type' | 'value'>): number {
  const subtotalCents = Math.round(subtotal * 100);
  const cents =
    discount.type === 'PERCENTAGE'
      ? Math.round((subtotalCents * discount.value) / 100)
      : Math.min(Math.round(discount.value * 100), subtotalCents);
  return cents / 100;
}

/** "10 %" o "$ 5.000": cómo se muestra el valor del cupón. */
export function formatDiscountValue(
  discount: Pick<DiscountResponse, 'type' | 'value'>,
  formatMoney: (value: number) => string,
): string {
  return discount.type === 'PERCENTAGE' ? `${discount.value} %` : formatMoney(discount.value);
}
