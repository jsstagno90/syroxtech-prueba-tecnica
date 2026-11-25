'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SaleDetailDialog } from '@/features/sales/sale-detail-dialog';
import { cn } from '@/lib/utils';
import { useMarkNotificationsRead, useNotificationsSummary } from './api';
import { NotificationIcon, NotificationSummaryLine, notificationTitle } from './notification-item';

/** Campanita del encabezado: cuántas hay sin leer y las últimas; cada una abre su venta. */
export function NotificationsBell() {
  const { data } = useNotificationsSummary();
  const markRead = useMarkNotificationsRead();
  const [saleId, setSaleId] = useState<number | null>(null);
  const unread = data?.unread ?? 0;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="relative"
            aria-label={unread ? `Notificaciones: ${unread} sin leer` : 'Notificaciones'}
          >
            <Bell />
            {unread > 0 && (
              <span className="bg-destructive absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] leading-none font-semibold text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-0">
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <DropdownMenuLabel className="p-0 text-sm">Notificaciones</DropdownMenuLabel>
            {unread > 0 && (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
                onClick={() => markRead.mutate()}
              >
                <CheckCheck className="size-3.5" /> Marcar como leídas
              </button>
            )}
          </div>
          <DropdownMenuSeparator className="m-0" />
          {data?.latest.length ? (
            data.latest.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn('items-start gap-3 rounded-none px-3 py-2.5', notification.unread && 'bg-primary/5')}
                onSelect={() => setSaleId(notification.saleId)}
              >
                <NotificationIcon type={notification.type} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{notificationTitle(notification)}</p>
                  <NotificationSummaryLine notification={notification} />
                </div>
                {notification.unread && <span className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" aria-label="Sin leer" />}
              </DropdownMenuItem>
            ))
          ) : (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">No hay notificaciones.</p>
          )}
          <DropdownMenuSeparator className="m-0" />
          <DropdownMenuItem asChild className="justify-center rounded-none py-2 text-sm font-medium">
            <Link href="/notificaciones">Ver todas</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SaleDetailDialog saleId={saleId} onOpenChange={(open) => !open && setSaleId(null)} />
    </>
  );
}
