'use client';

import { useMemo, useState } from 'react';
import { CheckCheck, Eye } from 'lucide-react';
import { NOTIFICATION_TYPES, NOTIFICATION_TYPE_LABELS, type NotificationResponse, type NotificationType } from '@admin/shared';
import { DataTable } from '@/components/data-table/data-table';
import { SearchInput } from '@/components/data-table/search-input';
import type { Column } from '@/components/data-table/types';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useTableState } from '@/hooks/use-table-state';
import { SaleDetailDialog } from '@/features/sales/sale-detail-dialog';
import { SaleStatusBadge } from '@/features/sales/status-badges';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { notificationHooks, useMarkNotificationsRead, useNotificationsSummary, type NotificationFilters } from './api';
import { NotificationIcon, notificationTitle } from './notification-item';

const ALL = 'all';

/** Actividad de la tienda: cada venta nueva y cada cambio de estado, con lo no leído destacado. */
export function NotificationsPage() {
  const table = useTableState<'createdAt'>();
  const [filters, setFilters] = useState<NotificationFilters>({});
  const [saleId, setSaleId] = useState<number | null>(null);
  const list = notificationHooks.useList({ ...table.query, ...filters });
  const summary = useNotificationsSummary();
  const markRead = useMarkNotificationsRead();

  const columns = useMemo<Column<NotificationResponse>[]>(
    () => [
      {
        id: 'event',
        header: 'Notificación',
        cell: (notification) => (
          <div className="flex items-center gap-3">
            <NotificationIcon type={notification.type} />
            <div className="min-w-0">
              <p className={cn('flex items-center gap-2', notification.unread && 'font-semibold')}>
                {notificationTitle(notification)}
                {notification.unread && <span className="bg-primary size-2 rounded-full" aria-label="Sin leer" />}
              </p>
              <p className="text-muted-foreground text-xs">
                {NOTIFICATION_TYPE_LABELS[notification.type]}
                {notification.note && ` · ${notification.note}`}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: 'order',
        header: 'Orden',
        cell: (notification) => (
          <div>
            <p className="font-mono text-sm">#{notification.orderNumber}</p>
            <p className="text-muted-foreground text-xs tabular-nums">{formatCurrency(notification.total)}</p>
          </div>
        ),
      },
      { id: 'status', header: 'Estado', cell: (notification) => <SaleStatusBadge status={notification.status} /> },
      {
        id: 'createdAt',
        header: 'Fecha',
        sortKey: 'createdAt',
        cell: (notification) => (
          <div className="text-sm">
            <p>{formatDateTime(notification.createdAt)}</p>
            <p className="text-muted-foreground text-xs">por {notification.createdBy}</p>
          </div>
        ),
      },
      {
        id: 'actions',
        header: <span className="sr-only">Acciones</span>,
        cell: (notification) => (
          <Button variant="ghost" size="icon-sm" onClick={() => setSaleId(notification.saleId)} aria-label={`Ver la venta ${notification.orderNumber}`}>
            <Eye />
          </Button>
        ),
        className: 'w-12',
      },
    ],
    [],
  );

  const unread = summary.data?.unread ?? 0;

  return (
    <>
      <PageHeader
        title="Notificaciones"
        description="Ventas nuevas, cambios de estado y cancelaciones, en orden."
        actions={
          <Button variant="outline" disabled={!unread || markRead.isPending} onClick={() => markRead.mutate()}>
            <CheckCheck /> Marcar todas como leídas
            {unread > 0 && <Badge variant="secondary">{unread}</Badge>}
          </Button>
        }
      />

      <DataTable
        title="Actividad"
        columns={columns}
        data={list.data?.data}
        meta={list.data?.meta}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        isError={list.isError}
        onRetry={list.refetch}
        sort={table.sort}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        emptyMessage={filters.unreadOnly ? 'Estás al día: no hay notificaciones sin leer.' : 'No hay notificaciones.'}
        toolbar={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput value={table.searchInput} onChange={table.setSearchInput} placeholder="Buscar orden o cliente..." className="sm:max-w-sm" />
            <Select
              value={filters.type ?? ALL}
              onValueChange={(value) => {
                setFilters((current) => ({ ...current, type: value === ALL ? undefined : (value as NotificationType) }));
                table.resetPage();
              }}
            >
              <SelectTrigger className="sm:w-48" aria-label="Filtrar por tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los tipos</SelectItem>
                {NOTIFICATION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {NOTIFICATION_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 sm:ml-2">
              <Switch
                id="unread-only"
                checked={!!filters.unreadOnly}
                onCheckedChange={(checked) => {
                  setFilters((current) => ({ ...current, unreadOnly: checked || undefined }));
                  table.resetPage();
                }}
              />
              <Label htmlFor="unread-only" className="font-normal">
                Solo sin leer
              </Label>
            </div>
          </div>
        }
      />

      <SaleDetailDialog saleId={saleId} onOpenChange={(open) => !open && setSaleId(null)} />
    </>
  );
}
