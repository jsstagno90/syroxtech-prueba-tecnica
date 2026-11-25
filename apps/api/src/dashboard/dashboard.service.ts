import { Injectable } from '@nestjs/common';
import { SALE_STATUSES, type DashboardSummary, type SaleStatus, type SalesByDay } from '@admin/shared';
import type { Prisma } from '../generated/prisma/client.js';
import { toNumber } from '../common/http/decimal.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toSaleResponse } from '../sales/sales.service.js';

/** Zona horaria de la tienda: define a qué día pertenece cada venta. */
const STORE_TIME_ZONE = 'America/Argentina/Buenos_Aires';
const CHART_DAYS = 30;

/** Una venta "cuenta" como ingreso si está cobrada y no fue cancelada. */
const REVENUE_FILTER = { paymentStatus: 'PAID', status: { not: 'CANCELLED' } } satisfies Prisma.SaleWhereInput;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(): Promise<DashboardSummary> {
    const [
      productsTotal,
      productsActive,
      categories,
      brands,
      salesTotal,
      revenue,
      salesByStatus,
      recentSales,
      topProducts,
      salesByDay,
      variantsCount,
      catalogValue,
      latestProducts,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.category.count(),
      this.prisma.brand.count(),
      this.prisma.sale.count(),
      this.prisma.sale.aggregate({ where: REVENUE_FILTER, _sum: { total: true }, _count: true }),
      this.prisma.sale.groupBy({ by: ['status'], _count: true }),
      this.prisma.sale.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { _count: { select: { items: true } } },
      }),
      this.prisma.saleItem.groupBy({
        by: ['productId', 'productName'],
        where: { sale: { status: { not: 'CANCELLED' } } },
        _sum: { quantity: true, subtotal: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      this.getSalesByDay(),
      this.prisma.productVariant.count(),
      this.prisma.product.aggregate({ where: { isActive: true }, _sum: { price: true } }),
      this.prisma.product.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { id: true, name: true, price: true, imageUrl: true, isActive: true, _count: { select: { variants: true } } },
      }),
    ]);

    const revenueTotal = toNumber(revenue._sum.total ?? 0);
    const byStatus = Object.fromEntries(SALE_STATUSES.map((status) => [status, 0])) as Record<SaleStatus, number>;
    for (const row of salesByStatus) byStatus[row.status] = row._count;

    return {
      catalog: {
        total: productsTotal,
        active: productsActive,
        variants: variantsCount,
        value: toNumber(catalogValue._sum.price ?? 0),
        latest: latestProducts.map(({ _count, price, ...product }) => ({
          ...product,
          price: toNumber(price),
          variantsCount: _count.variants,
        })),
      },
      products: { total: productsTotal, active: productsActive },
      categories,
      brands,
      sales: {
        total: salesTotal,
        revenue: revenueTotal,
        averageTicket: revenue._count ? Math.round((revenueTotal / revenue._count) * 100) / 100 : 0,
        byStatus,
      },
      recentSales: recentSales.map(toSaleResponse),
      topProducts: topProducts.map((row) => ({
        productId: row.productId,
        productName: row.productName,
        unitsSold: row._sum.quantity ?? 0,
        revenue: toNumber(row._sum.subtotal ?? 0),
      })),
      salesByDay,
    };
  }

  /** Ventas e ingresos por día de los últimos 30 días; los días sin ventas vienen en 0. */
  private async getSalesByDay(): Promise<SalesByDay[]> {
    // created_at se guarda en UTC: se pasa a la hora de la tienda antes de agrupar por día.
    const rows = await this.prisma.$queryRaw<{ day: string; sales: number; revenue: number }[]>`
      SELECT
        to_char((created_at AT TIME ZONE 'UTC') AT TIME ZONE ${STORE_TIME_ZONE}, 'YYYY-MM-DD') AS day,
        count(*)::int AS sales,
        coalesce(sum(total) FILTER (WHERE payment_status::text = 'PAID' AND status::text <> 'CANCELLED'), 0)::float AS revenue
      FROM sales
      WHERE created_at >= now() - make_interval(days => ${CHART_DAYS})
      GROUP BY day
    `;
    const byDay = new Map(rows.map((row) => [row.day, row]));

    const toDay = new Intl.DateTimeFormat('en-CA', { timeZone: STORE_TIME_ZONE }); // en-CA → YYYY-MM-DD
    const days: SalesByDay[] = [];
    for (let offset = CHART_DAYS - 1; offset >= 0; offset--) {
      const date = toDay.format(new Date(Date.now() - offset * 24 * 60 * 60 * 1000));
      const row = byDay.get(date);
      days.push({ date, sales: row?.sales ?? 0, revenue: row?.revenue ?? 0 });
    }
    return days;
  }
}
