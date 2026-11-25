'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, DollarSign, Package, Plus, Receipt, ShoppingCart, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { SALE_STATUSES, SALE_STATUS_LABELS, type DashboardSummary, type SaleStatus } from '@admin/shared';
import { StatCard } from '@/components/data-display/stat-card';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/features/auth/use-session';
import { SaleStatusBadge } from '@/features/sales/status-badges';
import { apiClient } from '@/lib/api/client';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { SalesChart } from './sales-chart';

const STATUS_BAR_COLORS: Record<SaleStatus, string> = {
  PENDING: 'bg-zinc-400',
  PREPARING: 'bg-amber-500',
  SHIPPED: 'bg-blue-500',
  COMPLETED: 'bg-emerald-500',
  CANCELLED: 'bg-red-500',
};

export function DashboardPage() {
  const { data: user } = useSession();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => apiClient.get<DashboardSummary>('dashboard/summary'),
  });

  return (
    <>
      <PageHeader
        title={user ? `Hola, ${user.name.split(' ')[0]}` : 'Inicio'}
        description="Resumen de la actividad de la tienda."
      />

      {isError ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground mb-3">No pudimos cargar el resumen.</p>
            <Button variant="outline" onClick={() => refetch()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : isLoading || !data ? (
        <DashboardSkeleton />
      ) : (
        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={DollarSign} label="Ingresos" value={formatCurrency(data.sales.revenue)} hint="Ventas pagadas, sin canceladas" />
            <StatCard icon={ShoppingCart} label="Ventas" value={formatNumber(data.sales.total)} hint={`${data.sales.byStatus.PENDING} pendientes de preparar`} />
            <StatCard icon={TrendingUp} label="Ticket promedio" value={formatCurrency(data.sales.averageTicket)} hint="Por venta cobrada" />
            <StatCard
              icon={Package}
              label="Productos activos"
              value={`${data.products.active} / ${data.products.total}`}
              hint={`${data.categories} categorías · ${data.brands} marcas`}
            />
          </div>

          <SalesChart data={data.salesByDay} />

          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <CatalogCard catalog={data.catalog} />

            <Card>
              <CardHeader>
                <CardTitle>Ventas recientes</CardTitle>
                <CardDescription>Las últimas 5 ventas registradas.</CardDescription>
                <CardAction>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/ventas">
                      Ver todas <ArrowRight />
                    </Link>
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                {data.recentSales.length === 0 ? (
                  <EmptyMessage>Todavía no hay ventas.</EmptyMessage>
                ) : (
                  <ul className="divide-y">
                    {data.recentSales.map((sale) => (
                      <li key={sale.id} className="flex items-center justify-between gap-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{sale.customerName}</p>
                          <p className="text-muted-foreground text-xs">
                            <span className="font-mono">#{sale.orderNumber}</span> · {formatDate(sale.createdAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(sale.total)}
                          </span>
                          <SaleStatusBadge status={sale.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <div className="grid content-start gap-6 lg:col-span-2 xl:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Productos más vendidos</CardTitle>
                  <CardDescription>Por unidades, sin contar ventas canceladas.</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.topProducts.length === 0 ? (
                    <EmptyMessage>No hay productos top para mostrar.</EmptyMessage>
                  ) : (
                    <ol className="grid gap-3">
                      {data.topProducts.map((product, index) => (
                        <li key={`${product.productId}-${product.productName}`} className="flex items-center gap-3">
                          <span className="bg-muted grid size-7 shrink-0 place-items-center rounded-md text-xs font-semibold">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{product.productName}</p>
                            <p className="text-muted-foreground text-xs">{formatCurrency(product.revenue)}</p>
                          </div>
                          <span className="text-sm tabular-nums">{product.unitsSold} u.</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ventas por estado</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <StatusBar byStatus={data.sales.byStatus} total={data.sales.total} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** En el diseño es "Inventario"; como la consigna excluye stock, muestra el catálogo y su valor. */
function CatalogCard({ catalog }: { catalog: DashboardSummary['catalog'] }) {
  const rest = catalog.total - catalog.latest.length;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Catálogo de productos</CardTitle>
        <CardAction>
          <Package className="text-muted-foreground size-4" />
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div>
          <p className="text-3xl font-bold tracking-tight tabular-nums">{formatNumber(catalog.total)}</p>
          <p className="text-muted-foreground text-xs">
            Productos en catálogo · {formatNumber(catalog.active)} activos · {formatNumber(catalog.variants)} variantes
          </p>
          <p className="mt-2 text-sm font-medium">Valor: {formatCurrency(catalog.value)}</p>
          <p className="text-muted-foreground text-xs">Suma de precios de los productos activos</p>
        </div>
        {catalog.latest.length === 0 ? (
          <EmptyMessage>Todavía no hay productos.</EmptyMessage>
        ) : (
          <ul className="grid gap-2 text-sm">
            {catalog.latest.map((product) => (
              <li key={product.id} className="flex items-center justify-between gap-3">
                <Link href={`/productos/${product.id}`} className="min-w-0 truncate hover:underline">
                  {product.name}
                </Link>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {product.variantsCount > 0 ? `${product.variantsCount} var.` : !product.isActive ? 'Inactivo' : formatCurrency(product.price)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {rest > 0 && <p className="text-muted-foreground text-center text-xs">+{formatNumber(rest)} productos más</p>}
        <div className="flex justify-between gap-2 border-t pt-4">
          <Button size="sm" asChild>
            <Link href="/productos/nuevo">
              <Plus /> Añadir
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/productos">Ver todos</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBar({ byStatus, total }: { byStatus: Record<SaleStatus, number>; total: number }) {
  if (total === 0) return <EmptyMessage>Sin ventas todavía.</EmptyMessage>;
  return (
    <>
      <div className="flex h-2.5 overflow-hidden rounded-full" role="img" aria-label="Distribución de ventas por estado">
        {SALE_STATUSES.map((status) =>
          byStatus[status] ? (
            <div key={status} className={STATUS_BAR_COLORS[status]} style={{ width: `${(byStatus[status] / total) * 100}%` }} />
          ) : null,
        )}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        {SALE_STATUSES.map((status) => (
          <li key={status} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className={cn('size-2 rounded-full', STATUS_BAR_COLORS[status])} />
              {SALE_STATUS_LABELS[status]}
            </span>
            <span className="text-muted-foreground tabular-nums">{byStatus[status]}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function EmptyMessage({ children }: { children: ReactNode }) {
  return (
    <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-sm">
      <Receipt className="size-6 opacity-40" />
      {children}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}
