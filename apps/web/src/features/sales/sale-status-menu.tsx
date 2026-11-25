'use client';

import { ChevronDown, Loader2 } from 'lucide-react';
import { SALE_STATUS_LABELS, SALE_STATUS_TRANSITIONS, type SaleResponse } from '@admin/shared';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SaleStatusBadge } from './status-badges';
import { SALE_ACTION_LABELS, useSaleStatusChange } from './use-sale-status-change';

/**
 * Estado de la venta con un menú para avanzarlo desde la tabla.
 * Solo ofrece los pasos permitidos por el flujo; las ventas cerradas no tienen menú.
 */
export function SaleStatusMenu({ sale }: { sale: SaleResponse }) {
  const { change, confirmDialog, isPending } = useSaleStatusChange();
  const nextStatuses = SALE_STATUS_TRANSITIONS[sale.status];

  if (nextStatuses.length === 0) return <SaleStatusBadge status={sale.status} />;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={isPending}
          className="hover:bg-muted focus-visible:ring-ring/50 -mx-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 outline-none focus-visible:ring-[3px]"
          aria-label={`Cambiar estado de la venta ${sale.orderNumber} (actual: ${SALE_STATUS_LABELS[sale.status]})`}
        >
          <SaleStatusBadge status={sale.status} />
          {isPending ? (
            <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
          ) : (
            <ChevronDown className="text-muted-foreground size-3.5" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">Cambiar estado</DropdownMenuLabel>
          {nextStatuses
            .filter((status) => status !== 'CANCELLED')
            .map((status) => (
              <DropdownMenuItem key={status} onSelect={() => change(sale, status)}>
                {SALE_ACTION_LABELS[status]}
              </DropdownMenuItem>
            ))}
          {nextStatuses.includes('CANCELLED') && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => change(sale, 'CANCELLED')}>
                {SALE_ACTION_LABELS.CANCELLED}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {confirmDialog}
    </>
  );
}
