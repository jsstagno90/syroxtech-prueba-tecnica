import { z } from 'zod';
import { createListQuerySchema, optionalText } from './common.js';
import { calculateDiscountAmount, type DiscountResponse } from './discounts.js';

/* ----------------------------- Estados ------------------------------ */

export const SALE_STATUSES = ['PENDING', 'PREPARING', 'SHIPPED', 'COMPLETED', 'CANCELLED'] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  PENDING: 'Pendiente',
  PREPARING: 'En preparación',
  SHIPPED: 'Enviado',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};

/**
 * Paso anterior de cada estado, para deshacer un cambio hecho por error.
 * Una venta cancelada se reabre como pendiente.
 */
export const SALE_STATUS_PREVIOUS: Partial<Record<SaleStatus, SaleStatus>> = {
  PREPARING: 'PENDING',
  SHIPPED: 'PREPARING',
  COMPLETED: 'SHIPPED',
  CANCELLED: 'PENDING',
};

/**
 * Flujo de una venta: avanzar un paso, volver uno atrás, cancelar antes del envío
 * o reabrir una cancelada.
 * La API rechaza cualquier cambio que no esté acá y el panel usa el mismo mapa
 * para mostrar solo las acciones posibles.
 */
export const SALE_STATUS_TRANSITIONS: Record<SaleStatus, readonly SaleStatus[]> = {
  PENDING: ['PREPARING', 'CANCELLED'],
  PREPARING: ['SHIPPED', 'PENDING', 'CANCELLED'],
  SHIPPED: ['COMPLETED', 'PREPARING'],
  COMPLETED: ['SHIPPED'],
  CANCELLED: ['PENDING'],
};

/** True si el cambio es volver al paso anterior (y no avanzar). */
export function isSaleStatusRollback(from: SaleStatus, to: SaleStatus): boolean {
  return SALE_STATUS_PREVIOUS[from] === to;
}

export function canTransitionSale(from: SaleStatus, to: SaleStatus): boolean {
  return SALE_STATUS_TRANSITIONS[from].includes(to);
}

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  FAILED: 'Fallido',
  REFUNDED: 'Reembolsado',
};

export const PAYMENT_METHODS = ['CARD', 'CASH', 'TRANSFER'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CARD: 'Tarjeta',
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
};

/* ----------------------------- Totales ------------------------------ */

export interface SaleLineInput {
  unitPrice: number;
  quantity: number;
}

/**
 * Calcula subtotales y total trabajando en centavos para evitar
 * errores de coma flotante (0.1 + 0.2). La usa la API para guardar
 * la venta y el panel para mostrar el total antes de confirmar.
 */
export function calculateSaleTotals<T extends SaleLineInput>(
  lines: readonly T[],
  discount?: Pick<DiscountResponse, 'type' | 'value'> | null,
) {
  const toCents = (value: number) => Math.round(value * 100);
  const detailed = lines.map((line) => ({
    ...line,
    subtotal: (toCents(line.unitPrice) * line.quantity) / 100,
  }));
  const subtotalCents = lines.reduce((acc, line) => acc + toCents(line.unitPrice) * line.quantity, 0);
  const subtotal = subtotalCents / 100;
  const discountAmount = discount ? calculateDiscountAmount(subtotal, discount) : 0;
  return { lines: detailed, subtotal, discountAmount, total: (subtotalCents - toCents(discountAmount)) / 100 };
}

/* ----------------------------- Schemas ------------------------------ */

export const saleItemSchema = z.object({
  productId: z.number({ error: 'Elegí un producto' }).int().positive('Elegí un producto'),
  quantity: z
    .number({ error: 'Ingresá una cantidad' })
    .int('Tiene que ser un número entero')
    .min(1, 'Mínimo 1')
    .max(999, 'Máximo 999'),
});

export const createSaleSchema = z
  .object({
    customerName: z.string().trim().min(2, 'Ingresá el nombre del cliente').max(120),
    customerEmail: z.email('Ingresá un correo válido').trim().toLowerCase(),
    customerPhone: optionalText(30).default(null),
    shippingAddress: optionalText(250).default(null),
    paymentMethod: z.enum(PAYMENT_METHODS),
    paymentStatus: z.enum(['PENDING', 'PAID']).default('PAID'),
    notes: optionalText(500).default(null),
    /** Código de cupón (opcional). La API valida que esté vigente y calcula el descuento. */
    discountCode: z
      .string()
      .trim()
      .toUpperCase()
      .max(20)
      .nullable()
      .optional()
      .transform((value) => value || null),
    items: z.array(saleItemSchema).min(1, 'Agregá al menos un producto').max(50),
  })
  .superRefine((sale, ctx) => {
    const ids = sale.items.map((item) => item.productId);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['items'],
        message: 'Hay productos repetidos: sumá la cantidad en una sola línea',
      });
    }
  });

export const updateSaleStatusSchema = z.object({
  status: z.enum(SALE_STATUSES),
  note: optionalText(500).default(null),
  /** Número de seguimiento del envío. Si no viene, no se toca. */
  trackingNumber: optionalText(60).optional(),
});

export const saleListQuerySchema = createListQuerySchema(['createdAt', 'total', 'customerName'] as const).extend({
  status: z.enum(SALE_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
});

export type CreateSaleInput = z.input<typeof createSaleSchema>;
export type CreateSaleDto = z.output<typeof createSaleSchema>;
export type UpdateSaleStatusInput = z.input<typeof updateSaleStatusSchema>;
export type UpdateSaleStatusDto = z.output<typeof updateSaleStatusSchema>;
export type SaleListQuery = z.output<typeof saleListQuerySchema>;

/* ---------------------------- Respuestas ----------------------------- */

export interface SaleItemResponse {
  id: number;
  /** `null` si el producto se eliminó después de la venta. */
  productId: number | null;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface SaleStatusEvent {
  id: number;
  status: SaleStatus;
  note: string | null;
  createdBy: string;
  createdAt: string;
}

export interface SaleResponse {
  id: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  shippingAddress: string | null;
  trackingNumber: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: SaleStatus;
  notes: string | null;
  subtotal: number;
  discountCode: string | null;
  discountAmount: number;
  total: number;
  itemsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaleDetailResponse extends SaleResponse {
  items: SaleItemResponse[];
  history: SaleStatusEvent[];
}
