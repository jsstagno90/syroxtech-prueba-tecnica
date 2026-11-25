import { Injectable } from '@nestjs/common';
import type {
  NotificationListQuery,
  NotificationResponse,
  NotificationsSummary,
  NotificationType,
  PaginatedResponse,
  SaleStatus,
} from '@admin/shared';
import { Prisma } from '../generated/prisma/client.js';
import { paginate, toPrismaPage } from '../common/http/pagination.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Si el usuario nunca abrió las notificaciones, cuentan como nuevas las de los últimos 3 días. */
const DEFAULT_UNREAD_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const LATEST_COUNT = 6;

interface NotificationRow {
  id: number;
  sale_id: number;
  order_number: string;
  customer_name: string;
  status: SaleStatus;
  total: number;
  note: string | null;
  created_by: string;
  created_at: Date;
  is_new_sale: boolean;
}

/**
 * Las notificaciones salen del historial de las ventas: no hace falta otra tabla.
 * El primer registro de cada venta es "venta nueva"; una cancelación se destaca aparte.
 */
const NOTIFICATIONS_CTE = Prisma.sql`
  WITH notifications AS (
    SELECT
      h.id, h.sale_id, s.order_number, s.customer_name, h.status::text AS status, s.total::float AS total,
      h.note, h.created_by, h.created_at,
      h.id = (SELECT min(first.id) FROM sale_status_history first WHERE first.sale_id = h.sale_id) AS is_new_sale
    FROM sale_status_history h
    JOIN sales s ON s.id = h.sale_id
  )`;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userId: number): Promise<NotificationsSummary> {
    const seenAt = await this.getSeenAt(userId);
    const [latest, [{ unread }]] = await Promise.all([
      this.prisma.$queryRaw<NotificationRow[]>`
        ${NOTIFICATIONS_CTE} SELECT * FROM notifications ORDER BY created_at DESC, id DESC LIMIT ${LATEST_COUNT}`,
      this.prisma.$queryRaw<{ unread: number }[]>`
        ${NOTIFICATIONS_CTE} SELECT count(*)::int AS unread FROM notifications WHERE created_at > ${seenAt}`,
    ]);
    return { unread, latest: latest.map((row) => toNotification(row, seenAt)) };
  }

  async findAll(userId: number, query: NotificationListQuery): Promise<PaginatedResponse<NotificationResponse>> {
    const seenAt = await this.getSeenAt(userId);
    const conditions: Prisma.Sql[] = [];
    if (query.type === 'NEW_SALE') conditions.push(Prisma.sql`is_new_sale`);
    if (query.type === 'CANCELLED') conditions.push(Prisma.sql`status = 'CANCELLED'`);
    if (query.type === 'STATUS_CHANGE') conditions.push(Prisma.sql`NOT is_new_sale AND status <> 'CANCELLED'`);
    if (query.unreadOnly) conditions.push(Prisma.sql`created_at > ${seenAt}`);
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(Prisma.sql`(order_number ILIKE ${term} OR customer_name ILIKE ${term})`);
    }
    const where = conditions.length ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}` : Prisma.empty;
    const direction = query.sortBy && query.sortOrder === 'asc' ? Prisma.raw('ASC') : Prisma.raw('DESC');
    const { skip, take } = toPrismaPage(query);

    const [rows, [{ total }]] = await Promise.all([
      this.prisma.$queryRaw<NotificationRow[]>`
        ${NOTIFICATIONS_CTE} SELECT * FROM notifications ${where}
        ORDER BY created_at ${direction}, id ${direction} LIMIT ${take} OFFSET ${skip}`,
      this.prisma.$queryRaw<{ total: number }[]>`${NOTIFICATIONS_CTE} SELECT count(*)::int AS total FROM notifications ${where}`,
    ]);
    return paginate(rows.map((row) => toNotification(row, seenAt)), total, query);
  }

  async markAllRead(userId: number): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { notificationsSeenAt: new Date() } });
  }

  private async getSeenAt(userId: number): Promise<Date> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { notificationsSeenAt: true } });
    return user?.notificationsSeenAt ?? new Date(Date.now() - DEFAULT_UNREAD_WINDOW_MS);
  }
}

function toNotification(row: NotificationRow, seenAt: Date): NotificationResponse {
  const type: NotificationType = row.is_new_sale ? 'NEW_SALE' : row.status === 'CANCELLED' ? 'CANCELLED' : 'STATUS_CHANGE';
  return {
    id: row.id,
    type,
    saleId: row.sale_id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    status: row.status,
    total: row.total,
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    unread: row.created_at > seenAt,
  };
}
