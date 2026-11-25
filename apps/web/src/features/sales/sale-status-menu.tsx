'use client';

import { ChevronDown, Loader2, Undo2 } from 'lucide-react';
import { isSaleStatusRollback, SALE_STATUS_LABELS, SALE_STATUS_TRANSITIONS, type SaleResponse } from '@admin/shared';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SaleStatusBadge } from './status-badges';
import { SALE_ACTION_LABELS, saleActionLabel, useSaleStatusChange } from './use-sale-status-change';

/**
 * Estado de la venta con un menú para avanzarlo desde la tabla.
 * Ofrece avanzar, volver un paso atrás (por si fue un error) o cancelar, según el flujo.
 * Las ventas canceladas no tienen menú.
 */
export function SaleStatusMenu({ sale }: { sale: SaleResponse }) {
  const { change, confirmDialog, isPending } = useSaleStatusChange();
  const nextStatuses = SALE_STATUS_TRANSITIONS[sale.status];
  const forward = nextStatuses.filter((status) => status !== 'CANCELLED' && !isSaleStatusRollback(sale.status, status));
  const back = nextStatuses.find((status) => isSaleStatusRollback(sale.status, status));

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
          {forward.map((status) => (
            <DropdownMenuItem key={status} onSelect={() => change(sale, status)}>
              {SALE_ACTION_LABELS[status]}
            </DropdownMenuItem>
          ))}
          {back && (
            <DropdownMenuItem onSelect={() => change(sale, back)}>
              <Undo2 className="text-muted-foreground" />
              {saleActionLabel(sale.status, back)}
            </DropdownMenuItem>
          )}
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
