import { z } from 'zod';
import { createListQuerySchema } from './common.js';
import type { SaleStatus } from './sales.js';

export const NOTIFICATION_TYPES = ['NEW_SALE', 'STATUS_CHANGE', 'CANCELLED'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  NEW_SALE: 'Venta nueva',
  STATUS_CHANGE: 'Cambio de estado',
  CANCELLED: 'Cancelación',
};

export const notificationListQuerySchema = createListQuerySchema(['createdAt'] as const).extend({
  type: z.enum(NOTIFICATION_TYPES).optional(),
  unreadOnly: z.stringbool().optional(),
});

export type NotificationListQuery = z.output<typeof notificationListQuerySchema>;

/** Cada movimiento del historial de una venta es una notificación. */
export interface NotificationResponse {
  id: number;
  type: NotificationType;
  saleId: number;
  orderNumber: string;
  customerName: string;
  status: SaleStatus;
  total: number;
  note: string | null;
  createdBy: string;
  createdAt: string;
  unread: boolean;
}

export interface NotificationsSummary {
  unread: number;
  latest: NotificationResponse[];
}
