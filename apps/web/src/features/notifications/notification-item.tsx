import { Ban, RefreshCw, ShoppingBag } from 'lucide-react';
import { SALE_STATUS_LABELS, type NotificationResponse, type NotificationType } from '@admin/shared';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const ICONS: Record<NotificationType, { icon: typeof ShoppingBag; className: string }> = {
  NEW_SALE: { icon: ShoppingBag, className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  STATUS_CHANGE: { icon: RefreshCw, className: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  CANCELLED: { icon: Ban, className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
};

/** El texto de cada notificación según qué pasó con la venta. */
export function notificationTitle(notification: NotificationResponse) {
  if (notification.type === 'NEW_SALE') return `Venta nueva de ${notification.customerName}`;
  if (notification.type === 'CANCELLED') return `Se canceló la venta de ${notification.customerName}`;
  return `${notification.customerName}: ${SALE_STATUS_LABELS[notification.status].toLowerCase()}`;
}

/** Ícono por tipo (el tipo también va escrito, el color no es lo único que lo distingue). */
export function NotificationIcon({ type, className }: { type: NotificationType; className?: string }) {
  const { icon: Icon, className: tone } = ICONS[type];
  return (
    <span className={cn('grid size-8 shrink-0 place-items-center rounded-full', tone, className)}>
      <Icon className="size-4" />
    </span>
  );
}

export function NotificationSummaryLine({ notification }: { notification: NotificationResponse }) {
  return (
    <p className="text-muted-foreground text-xs">
      <span className="font-mono">#{notification.orderNumber}</span> · {formatCurrency(notification.total)} ·{' '}
      {formatDateTime(notification.createdAt)}
    </p>
  );
}
