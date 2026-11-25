import { Injectable } from '@nestjs/common';
import {
  PAYMENT_METHODS,
  SALE_STATUSES,
  type PaymentMethod,
  type SaleStatus,
  type StatsQuery,
  type StatsRange,
  type StatsResponse,
} from '@admin/shared';
import type { Prisma } from '../generated/prisma/client.js';
import { toNumber } from '../common/http/decimal.js';
import { PrismaService } from '../prisma/prisma.service.js';

const STORE_TIME_ZONE = 'America/Argentina/Buenos_Aires';

/** Cada rango se agrupa con la granularidad que se lee mejor en un gráfico. */
const RANGES: Record<StatsRange, { granularity: StatsResponse['granularity']; back: string }> = {
  '30d': { granularity: 'day', back: '29 days' },
  '90d': { granularity: 'week', back: '12 weeks' },
  '12m': { granularity: 'month', back: '11 months' },
};

const NOT_CANCELLED = { status: { not: 'CANCELLED' } } satisfies Prisma.SaleWhereInput;
const REVENUE = { paymentStatus: 'PAID', status: { not: 'CANCELLED' } } satisfies Prisma.SaleWhereInput;

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async get({ range }: StatsQuery): Promise<StatsResponse> {
    const { granularity, back } = RANGES[range];

    // Los períodos se arman en la zona de la tienda y se completan los que no tuvieron ventas.
    const periods = await this.prisma.$queryRaw<{ period: string; start: Date; sales: number; revenue: number }[]>`
      WITH periods AS (
        SELECT generate_series(
          date_trunc(${granularity}, (now() AT TIME ZONE ${STORE_TIME_ZONE}) - ${back}::interval),
          date_trunc(${granularity}, now() AT TIME ZONE ${STORE_TIME_ZONE}),
          ('1 ' || ${granularity})::interval
        ) AS period
      )
      SELECT
        to_char(p.period, 'YYYY-MM-DD') AS period,
        p.period AT TIME ZONE ${STORE_TIME_ZONE} AS start,
        count(s.id)::int AS sales,
        coalesce(sum(s.total) FILTER (WHERE s.payment_status::text = 'PAID' AND s.status::text <> 'CANCELLED'), 0)::float AS revenue
      FROM periods p
      LEFT JOIN sales s
        ON date_trunc(${granularity}, (s.created_at AT TIME ZONE 'UTC') AT TIME ZONE ${STORE_TIME_ZONE}) = p.period
      GROUP BY p.period
      ORDER BY p.period`;

    const from = periods[0]!.start;
    const inRange = { createdAt: { gte: from } } satisfies Prisma.SaleWhereInput;

    const [count, revenue, customers, discounts, byStatus, byMethod, byCategory, topCustomers] = await Promise.all([
      this.prisma.sale.count({ where: inRange }),
      this.prisma.sale.aggregate({ where: { ...inRange, ...REVENUE }, _sum: { total: true }, _count: true }),
      this.prisma.sale.findMany({ where: { ...inRange, ...NOT_CANCELLED }, distinct: ['customerEmail'], select: { id: true } }),
      this.prisma.sale.aggregate({ where: { ...inRange, ...NOT_CANCELLED }, _sum: { discountAmount: true } }),
      this.prisma.sale.groupBy({ by: ['status'], where: inRange, _count: true }),
      this.prisma.sale.groupBy({ by: ['paymentMethod'], where: { ...inRange, ...NOT_CANCELLED }, _count: true, _sum: { total: true } }),
      this.prisma.$queryRaw<{ category_id: number | null; name: string; revenue: number; units: number }[]>`
        SELECT c.id AS category_id,
          coalesce(concat_ws(' › ', parent.name, c.name), 'Productos eliminados') AS name,
          sum(i.subtotal)::float AS revenue, sum(i.quantity)::int AS units
        FROM sale_items i
        JOIN sales s ON s.id = i.sale_id
        LEFT JOIN products p ON p.id = i.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN categories parent ON parent.id = c.parent_id
        WHERE s.status::text <> 'CANCELLED' AND s.created_at >= ${from}
        GROUP BY c.id, c.name, parent.name
        ORDER BY revenue DESC
        LIMIT 8`,
      this.prisma.$queryRaw<{ email: string; name: string; revenue: number; orders: number }[]>`
        SELECT lower(customer_email) AS email, (array_agg(customer_name ORDER BY created_at DESC))[1] AS name,
          sum(total)::float AS revenue, count(*)::int AS orders
        FROM sales
        WHERE status::text <> 'CANCELLED' AND created_at >= ${from}
        GROUP BY lower(customer_email)
        ORDER BY revenue DESC
        LIMIT 5`,
    ]);

    const revenueTotal = toNumber(revenue._sum.total ?? 0);
    const statusCount = new Map(byStatus.map((row) => [row.status, row._count]));
    const methodRows = new Map(byMethod.map((row) => [row.paymentMethod, row]));

    return {
      range,
      granularity,
      kpis: {
        revenue: revenueTotal,
        sales: count,
        averageTicket: revenue._count ? Math.round((revenueTotal / revenue._count) * 100) / 100 : 0,
        customers: customers.length,
        cancelledRate: count ? Math.round(((statusCount.get('CANCELLED') ?? 0) / count) * 1000) / 10 : 0,
        discounts: toNumber(discounts._sum.discountAmount ?? 0),
      },
      revenueByPeriod: periods.map(({ period, sales, revenue: amount }) => ({ period, sales, revenue: amount })),
      byStatus: SALE_STATUSES.map((status: SaleStatus) => ({ status, count: statusCount.get(status) ?? 0 })),
      byPaymentMethod: PAYMENT_METHODS.map((method: PaymentMethod) => ({
        method,
        count: methodRows.get(method)?._count ?? 0,
        revenue: toNumber(methodRows.get(method)?._sum.total ?? 0),
      })),
      byCategory: byCategory.map((row) => ({ categoryId: row.category_id, name: row.name, revenue: row.revenue, units: row.units })),
      topCustomers,
    };
  }
}
