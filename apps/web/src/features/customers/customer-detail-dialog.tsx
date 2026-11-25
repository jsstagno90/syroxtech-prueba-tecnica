'use client';

import { Eye } from 'lucide-react';
import type { CustomerResponse } from '@admin/shared';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { TierBadge } from '@/features/memberships/tier-badge';
import { saleHooks } from '@/features/sales/api';
import { SaleStatusBadge } from '@/features/sales/status-badges';
import { formatCurrency, formatDate, formatNumber, initials } from '@/lib/format';

interface CustomerDetailDialogProps {
  customer: CustomerResponse | null;
  onOpenChange: (open: boolean) => void;
  onViewSale: (saleId: number) => void;
}

/** Ficha del cliente: resumen, nivel, puntos y todas sus compras. */
export function CustomerDetailDialog({ customer, onOpenChange, onViewSale }: CustomerDetailDialogProps) {
  const sales = saleHooks.useList({
    page: 1,
    pageSize: 50,
    search: customer?.email,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  // La búsqueda de ventas es por texto: se quedan solo las de este correo exacto.
  const orders = (sales.data?.data ?? []).filter((sale) => sale.customerEmail.toLowerCase() === customer?.email);

  return (
    <Dialog open={customer !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {customer && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <Avatar className="size-11">
                  <AvatarFallback>{initials(customer.name)}</AvatarFallback>
                </Avatar>
                <div className="grid gap-0.5 text-left">
                  <DialogTitle>{customer.name}</DialogTitle>
                  <DialogDescription>
                    {customer.email}
                    {customer.phone && ` · ${customer.phone}`}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Pedidos" value={formatNumber(customer.ordersCount)} />
              <Stat label="Total gastado" value={formatCurrency(customer.totalSpent)} />
              <Stat label="Puntos" value={formatNumber(customer.points)} />
              <div className="grid gap-1 rounded-lg border p-3">
                <dt className="text-muted-foreground text-xs">Membresía</dt>
                <dd>
                  <TierBadge tier={customer.tier} />
                </dd>
              </div>
            </dl>
            <p className="text-muted-foreground text-xs">
              Cliente desde el {formatDate(customer.firstOrderAt)} · última compra el {formatDate(customer.lastOrderAt)}
            </p>

            <div className="grid gap-2">
              <h3 className="text-sm font-semibold">Compras</h3>
              {sales.isLoading ? (
                <Skeleton className="h-40" />
              ) : (
                <ul className="max-h-72 divide-y overflow-y-auto rounded-lg border">
                  {orders.map((sale) => (
                    <li key={sale.id} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-sm">#{sale.orderNumber}</p>
                        <p className="text-muted-foreground text-xs">
                          {formatDate(sale.createdAt)} · {sale.itemsCount} {sale.itemsCount === 1 ? 'ítem' : 'ítems'}
                          {sale.discountCode && ` · cupón ${sale.discountCode}`}
                        </p>
                      </div>
                      <SaleStatusBadge status={sale.status} />
                      <span className="w-28 text-right font-medium tabular-nums">{formatCurrency(sale.total)}</span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onViewSale(sale.id)}
                        aria-label={`Ver la venta ${sale.orderNumber}`}
                      >
                        <Eye />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-lg border p-3">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
