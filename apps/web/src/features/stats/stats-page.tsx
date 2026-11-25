'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BadgePercent, Ban, DollarSign, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import {
  PAYMENT_METHOD_LABELS,
  SALE_STATUS_LABELS,
  STATS_RANGES,
  STATS_RANGE_LABELS,
  type SaleStatus,
  type StatsRange,
  type StatsResponse,
} from '@admin/shared';
import { BarList } from '@/components/data-display/bar-list';
import { StatCard } from '@/components/data-display/stat-card';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SalesChart } from '@/features/dashboard/sales-chart';
import { apiClient } from '@/lib/api/client';
import { formatCurrency, formatNumber, initials } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Colores de estado: los mismos que en Inicio, siempre acompañados del nombre. */
const STATUS_BAR: Record<SaleStatus, string> = {
  PENDING: 'bg-zinc-400',
  PREPARING: 'bg-amber-500',
  SHIPPED: 'bg-blue-500',
  COMPLETED: 'bg-emerald-500',
  CANCELLED: 'bg-red-500',
};

const PERIOD_TITLE: Record<StatsRange, string> = {
  '30d': 'por día · últimos 30 días',
  '90d': 'por semana · últimos 90 días',
  '12m': 'por mes · últimos 12 meses',
};

export function StatsPage() {
  const [range, setRange] = useState<StatsRange>('12m');
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['stats', range],
    queryFn: () => apiClient.get<StatsResponse>('stats', { query: { range } }),
    placeholderData: (previous) => previous,
  });

  return (
    <>
      <PageHeader
        title="Estadísticas"
        description="Cómo viene la tienda: ingresos, ventas, clientes y qué se vende más."
        actions={
          <div className="bg-muted inline-flex rounded-lg p-0.5" role="group" aria-label="Período">
            {STATS_RANGES.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setRange(key)}
                aria-pressed={range === key}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  range === key ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {STATS_RANGE_LABELS[key]}
              </button>
            ))}
          </div>
        }
      />

      {isError ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground mb-3">No pudimos cargar las estadísticas.</p>
            <Button variant="outline" onClick={() => refetch()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : isLoading || !data ? (
        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : (
        <div className={cn('grid gap-6 transition-opacity', isFetching && 'opacity-60')} aria-busy={isFetching}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard icon={DollarSign} label="Ingresos" value={formatCurrency(data.kpis.revenue)} hint="Ventas cobradas, sin canceladas" />
            <StatCard icon={ShoppingCart} label="Ventas" value={formatNumber(data.kpis.sales)} hint="Todas las registradas en el período" />
            <StatCard icon={TrendingUp} label="Ticket promedio" value={formatCurrency(data.kpis.averageTicket)} hint="Por venta cobrada" />
            <StatCard icon={Users} label="Clientes" value={formatNumber(data.kpis.customers)} hint="Compraron al menos una vez" />
            <StatCard icon={Ban} label="Cancelaciones" value={`${data.kpis.cancelledRate.toLocaleString('es-AR')} %`} hint="Del total de ventas" />
            <StatCard icon={BadgePercent} label="Descuentos otorgados" value={formatCurrency(data.kpis.discounts)} hint="Con cupones" />
          </div>

          <SalesChart
            data={data.revenueByPeriod.map((point) => ({ date: point.period, sales: point.sales, revenue: point.revenue }))}
            granularity={data.granularity}
            periodLabel={PERIOD_TITLE[range]}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Ingresos por categoría</CardTitle>
                <CardDescription>Lo vendido de cada categoría (sin canceladas).</CardDescription>
              </CardHeader>
              <CardContent>
                <BarList
                  label="Ingresos por categoría"
                  items={data.byCategory.map((row) => ({
                    key: String(row.categoryId ?? row.name),
                    label: row.name,
                    value: row.revenue,
                    display: `${formatCurrency(row.revenue)} · ${formatNumber(row.units)} u.`,
                  }))}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mejores clientes</CardTitle>
                <CardDescription>Los que más compraron en el período.</CardDescription>
              </CardHeader>
              <CardContent>
                {data.topCustomers.length === 0 ? (
                  <p className="text-muted-foreground py-6 text-center text-sm">Sin ventas en el período.</p>
                ) : (
                  <ol className="grid gap-3">
                    {data.topCustomers.map((customer, index) => (
                      <li key={customer.email} className="flex items-center gap-3">
                        <span className="bg-muted grid size-7 shrink-0 place-items-center rounded-md text-xs font-semibold">
                          {index + 1}
                        </span>
                        <span className="bg-primary/10 grid size-8 shrink-0 place-items-center rounded-full text-xs font-medium">
                          {initials(customer.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{customer.name}</p>
                          <p className="text-muted-foreground text-xs">
                            {customer.orders} {customer.orders === 1 ? 'compra' : 'compras'}
                          </p>
                        </div>
                        <span className="text-sm font-medium tabular-nums">{formatCurrency(customer.revenue)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Medios de pago</CardTitle>
                <CardDescription>Cantidad de ventas e importe (sin canceladas).</CardDescription>
              </CardHeader>
              <CardContent>
                <BarList
                  label="Ventas por medio de pago"
                  items={data.byPaymentMethod.map((row) => ({
                    key: row.method,
                    label: PAYMENT_METHOD_LABELS[row.method],
                    value: row.count,
                    display: `${formatNumber(row.count)} ventas · ${formatCurrency(row.revenue)}`,
                  }))}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ventas por estado</CardTitle>
                <CardDescription>Dónde está cada venta del período.</CardDescription>
              </CardHeader>
              <CardContent>
                <BarList
                  label="Ventas por estado"
                  items={data.byStatus.map((row) => ({
                    key: row.status,
                    label: SALE_STATUS_LABELS[row.status],
                    value: row.count,
                    display: formatNumber(row.count),
                    barClassName: STATUS_BAR[row.status],
                  }))}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
