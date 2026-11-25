import { z } from 'zod';
import type { PaymentMethod, SaleStatus } from './sales.js';

export const STATS_RANGES = ['30d', '90d', '12m'] as const;
export type StatsRange = (typeof STATS_RANGES)[number];

export const STATS_RANGE_LABELS: Record<StatsRange, string> = {
  '30d': 'Últimos 30 días',
  '90d': 'Últimos 90 días',
  '12m': 'Últimos 12 meses',
};

export const statsQuerySchema = z.object({ range: z.enum(STATS_RANGES).default('12m') });
export type StatsQuery = z.output<typeof statsQuerySchema>;

export interface StatsPeriod {
  /** Inicio del período (YYYY-MM-DD): día, semana o mes según el rango. */
  period: string;
  revenue: number;
  sales: number;
}

export interface StatsResponse {
  range: StatsRange;
  /** Cómo se agrupa la serie temporal. */
  granularity: 'day' | 'week' | 'month';
  kpis: {
    /** Ventas pagadas y no canceladas. */
    revenue: number;
    sales: number;
    averageTicket: number;
    customers: number;
    /** Porcentaje de ventas canceladas (0 a 100). */
    cancelledRate: number;
    discounts: number;
  };
  revenueByPeriod: StatsPeriod[];
  byStatus: { status: SaleStatus; count: number }[];
  byPaymentMethod: { method: PaymentMethod; count: number; revenue: number }[];
  byCategory: { categoryId: number | null; name: string; revenue: number; units: number }[];
  topCustomers: { email: string; name: string; revenue: number; orders: number }[];
}
