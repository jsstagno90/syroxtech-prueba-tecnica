import type { SaleResponse, SaleStatus } from './sales.js';

export interface TopProduct {
  productId: number | null;
  productName: string;
  unitsSold: number;
  revenue: number;
}

export interface SalesByDay {
  /** Día en formato YYYY-MM-DD (zona horaria de la tienda). */
  date: string;
  /** Ventas registradas ese día (todas, incluso canceladas). */
  sales: number;
  /** Ingresos del día: ventas pagadas y no canceladas. */
  revenue: number;
}

export interface DashboardSummary {
  products: { total: number; active: number };
  categories: number;
  brands: number;
  sales: {
    total: number;
    /** Ingresos de ventas pagadas y no canceladas. */
    revenue: number;
    averageTicket: number;
    byStatus: Record<SaleStatus, number>;
  };
  recentSales: SaleResponse[];
  topProducts: TopProduct[];
  /** Últimos 30 días, incluidos los días sin ventas (en 0). */
  salesByDay: SalesByDay[];
}
