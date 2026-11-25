import { Injectable } from '@nestjs/common';
import {
  calculatePoints,
  resolveTier,
  type CustomerListQuery,
  type CustomerResponse,
  type LoyaltySummary,
  type MembershipTierRef,
  type PaginatedResponse,
  type TierColor,
} from '@admin/shared';
import { Prisma } from '../generated/prisma/client.js';
import { toNumber } from '../common/http/decimal.js';
import { paginate, toPrismaPage } from '../common/http/pagination.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';

interface CustomerRow {
  email: string;
  name: string;
  phone: string | null;
  orders_count: number;
  total_spent: number;
  first_order_at: Date;
  last_order_at: Date;
}

type Tier = MembershipTierRef & { minSpent: number };

/** Columnas por las que se puede ordenar (lista cerrada: nunca se interpola lo que manda el cliente). */
const SORT_COLUMNS = {
  lastOrderAt: 'last_order_at',
  ordersCount: 'orders_count',
  totalSpent: 'total_spent',
  name: 'name',
} as const;

/**
 * Los clientes salen de las ventas agrupadas por correo (en minúscula).
 * Nombre y teléfono son los de su última compra; gasto y pedidos no cuentan las canceladas.
 */
const CUSTOMERS_CTE = Prisma.sql`
  WITH customers AS (
    SELECT
      lower(customer_email) AS email,
      (array_agg(customer_name ORDER BY created_at DESC))[1] AS name,
      (array_agg(customer_phone ORDER BY created_at DESC))[1] AS phone,
      (count(*) FILTER (WHERE status::text <> 'CANCELLED'))::int AS orders_count,
      coalesce(sum(total) FILTER (WHERE status::text <> 'CANCELLED'), 0)::float AS total_spent,
      min(created_at) AS first_order_at,
      max(created_at) AS last_order_at
    FROM sales
    GROUP BY lower(customer_email)
  )`;

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async findAll(query: CustomerListQuery): Promise<PaginatedResponse<CustomerResponse>> {
    const tiers = await this.getTiers();
    const where = this.buildWhere(query, tiers);

    // Los puntos dependen del nivel, así que ese orden se resuelve en memoria.
    if (query.sortBy === 'points') {
      const rows = await this.prisma.$queryRaw<CustomerRow[]>`${CUSTOMERS_CTE} SELECT * FROM customers ${where}`;
      const all = await this.enrich(rows, tiers);
      all.sort((a, b) => (query.sortOrder === 'asc' ? a.points - b.points : b.points - a.points) || b.totalSpent - a.totalSpent);
      const { skip, take } = toPrismaPage(query);
      return paginate(all.slice(skip, skip + take), all.length, query);
    }

    const column = SORT_COLUMNS[query.sortBy ?? 'lastOrderAt'];
    const direction = query.sortBy && query.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const { skip, take } = toPrismaPage(query);
    const [rows, [{ total }]] = await Promise.all([
      this.prisma.$queryRaw<CustomerRow[]>`
        ${CUSTOMERS_CTE}
        SELECT * FROM customers ${where}
        ORDER BY ${Prisma.raw(`${column} ${direction}`)}, email ASC
        LIMIT ${take} OFFSET ${skip}`,
      this.prisma.$queryRaw<{ total: number }[]>`${CUSTOMERS_CTE} SELECT count(*)::int AS total FROM customers ${where}`,
    ]);
    return paginate(await this.enrich(rows, tiers), total, query);
  }

  /** Gasto de cada cliente: alcanza para contar miembros por nivel y sumar puntos. */
  async spentByCustomer(): Promise<number[]> {
    const rows = await this.prisma.$queryRaw<{ total_spent: number }[]>`${CUSTOMERS_CTE} SELECT total_spent FROM customers`;
    return rows.map((row) => row.total_spent);
  }

  async loyaltySummary(): Promise<LoyaltySummary> {
    const [settings, tiers, spent] = await Promise.all([this.settings.get(), this.getTiers(), this.spentByCustomer()]);
    const points = spent.map((value) =>
      calculatePoints(value, settings.amountPerPoint, resolveTier(value, tiers)?.pointsMultiplier ?? 1),
    );
    return {
      settings: { loyaltyEnabled: settings.loyaltyEnabled, amountPerPoint: settings.amountPerPoint },
      totalPoints: settings.loyaltyEnabled ? points.reduce((acc, value) => acc + value, 0) : 0,
      customersWithPoints: settings.loyaltyEnabled ? points.filter((value) => value > 0).length : 0,
    };
  }

  private buildWhere(query: CustomerListQuery, tiers: Tier[]) {
    const conditions: Prisma.Sql[] = [];
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(Prisma.sql`(name ILIKE ${term} OR email ILIKE ${term})`);
    }
    if (query.tierId) {
      const sorted = [...tiers].sort((a, b) => a.minSpent - b.minSpent);
      const index = sorted.findIndex((tier) => tier.id === query.tierId);
      if (index === -1) conditions.push(Prisma.sql`false`);
      else {
        conditions.push(Prisma.sql`total_spent >= ${sorted[index]!.minSpent}`);
        const next = sorted[index + 1];
        if (next) conditions.push(Prisma.sql`total_spent < ${next.minSpent}`);
      }
    }
    return conditions.length ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}` : Prisma.empty;
  }

  private async getTiers(): Promise<Tier[]> {
    const tiers = await this.prisma.membershipTier.findMany({ orderBy: { minSpent: 'asc' } });
    return tiers.map((tier) => ({
      id: tier.id,
      name: tier.name,
      color: tier.color as TierColor,
      minSpent: toNumber(tier.minSpent),
      pointsMultiplier: toNumber(tier.pointsMultiplier),
    }));
  }

  private async enrich(rows: CustomerRow[], tiers: Tier[]): Promise<CustomerResponse[]> {
    const settings = await this.settings.get();
    return rows.map((row) => {
      const tier = resolveTier(row.total_spent, tiers);
      return {
        email: row.email,
        name: row.name,
        phone: row.phone,
        ordersCount: row.orders_count,
        totalSpent: row.total_spent,
        firstOrderAt: row.first_order_at.toISOString(),
        lastOrderAt: row.last_order_at.toISOString(),
        tier: tier && { id: tier.id, name: tier.name, color: tier.color, pointsMultiplier: tier.pointsMultiplier },
        points: settings.loyaltyEnabled
          ? calculatePoints(row.total_spent, settings.amountPerPoint, tier?.pointsMultiplier ?? 1)
          : 0,
      };
    });
  }
}
