'use client';

import { useMemo, useState } from 'react';
import type { SalesByDay } from '@admin/shared';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { siteConfig } from '@/config/site';
import { formatCurrency, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

type Metric = 'revenue' | 'sales';

const METRICS: Record<Metric, { label: string; format: (value: number) => string }> = {
  revenue: { label: 'Ingresos', format: formatCurrency },
  sales: { label: 'Ventas', format: (value) => `${formatNumber(value)} ${value === 1 ? 'venta' : 'ventas'}` },
};

const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(siteConfig.locale, { ...options, timeZone: 'UTC' });
const dayShort = fmt({ day: 'numeric', month: 'short' });

export type ChartGranularity = 'day' | 'week' | 'month';

/** Cómo se rotula cada barra según el período que representa. */
const PERIODS: Record<ChartGranularity, { short: (d: Date) => string; long: (d: Date) => string; labelEvery: number; noun: string }> = {
  day: { short: (d) => dayShort.format(d), long: (d) => fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(d), labelEvery: 7, noun: 'día' },
  week: { short: (d) => dayShort.format(d), long: (d) => `Semana del ${fmt({ day: 'numeric', month: 'long' }).format(d)}`, labelEvery: 2, noun: 'semana' },
  month: { short: (d) => fmt({ month: 'short' }).format(d), long: (d) => fmt({ month: 'long', year: 'numeric' }).format(d), labelEvery: 1, noun: 'mes' },
};

/** "2026-11-25" → fecha UTC a medianoche, para formatear el día sin correrse por la zona horaria. */
const parseDay = (date: string) => new Date(`${date}T00:00:00Z`);

/** Redondea el máximo del eje a un número "lindo" (1, 2, 5 × 10ⁿ). */
function niceMax(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * magnitude >= value)!;
  return step * magnitude;
}

interface SalesChartProps {
  data: SalesByDay[];
  /** Cada barra es un día, una semana o un mes (lo usa Estadísticas). */
  granularity?: ChartGranularity;
  /** Lo que sigue a la medida en el título: "Ingresos de los últimos 30 días". */
  periodLabel?: string;
}

/**
 * Barras de ventas por período. Una sola medida a la vez (ingresos o cantidad):
 * son escalas distintas y mezclarlas en un mismo gráfico con dos ejes confunde.
 */
export function SalesChart({ data, granularity = 'day', periodLabel = 'de los últimos 30 días' }: SalesChartProps) {
  const period = PERIODS[granularity];
  const [metric, setMetric] = useState<Metric>('revenue');
  const [hovered, setHovered] = useState<number | null>(null);

  const values = data.map((day) => day[metric]);
  // Las cantidades son enteras: el eje arranca en 2 como mínimo para que la marca del medio no sea "0,5 ventas".
  const highest = Math.max(...values, 0);
  const max = metric === 'sales' ? Math.max(2, Math.ceil(highest / 2) * 2) : niceMax(highest);
  const total = values.reduce((sum, value) => sum + value, 0);
  const ticks = [max, max / 2, 0];
  const { format, label } = METRICS[metric];
  const active = hovered === null ? null : data[hovered];

  const xLabels = useMemo(
    // Etiquetas espaciadas contando desde el final hacia atrás (así el último período siempre tiene la suya).
    () => new Set(data.map((_, index) => index).filter((index) => (data.length - 1 - index) % period.labelEvery === 0)),
    [data, period.labelEvery],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {label} {periodLabel}
        </CardTitle>
        <CardDescription>
          Total del período: <span className="text-foreground font-medium">{format(total)}</span>
        </CardDescription>
        <CardAction>
          <div className="bg-muted inline-flex rounded-lg p-0.5" role="group" aria-label="Medida del gráfico">
            {(Object.keys(METRICS) as Metric[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setMetric(key)}
                aria-pressed={metric === key}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  metric === key ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {METRICS[key].label}
              </button>
            ))}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          {/* Eje Y: pocas marcas y recesivas */}
          <div className="text-muted-foreground flex h-48 w-16 shrink-0 flex-col justify-between text-right text-[11px] tabular-nums" aria-hidden>
            {ticks.map((tick) => (
              <span key={tick} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
                {metric === 'revenue' ? compactCurrency(tick) : formatNumber(tick)}
              </span>
            ))}
          </div>

          <div className="relative min-w-0 flex-1">
            {/* Líneas de referencia */}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex h-48 flex-col justify-between" aria-hidden>
              <div className="border-border/60 border-t border-dashed" />
              <div className="border-border/60 border-t border-dashed" />
              <div className="border-border border-t" />
            </div>

            {/* Barras (cada columna es el área de hover, más grande que la barra) */}
            <div className="relative flex h-48 items-end gap-0.5" onMouseLeave={() => setHovered(null)}>
              {data.map((day, index) => {
                const value = day[metric];
                const height = value === 0 ? 0 : Math.max((value / max) * 100, 2);
                return (
                  <div
                    key={day.date}
                    className="group flex h-full flex-1 cursor-default items-end justify-center"
                    onMouseEnter={() => setHovered(index)}
                    onFocus={() => setHovered(index)}
                    tabIndex={0}
                    aria-label={`${period.long(parseDay(day.date))}: ${format(value)}`}
                  >
                    <div
                      className={cn(
                        'w-full rounded-t-[4px] bg-blue-600 transition-opacity dark:bg-blue-400',
                        data.length > 20 ? 'max-w-4' : 'max-w-10',
                        hovered !== null && hovered !== index && 'opacity-40',
                      )}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Tooltip */}
            {active && hovered !== null && (
              <div
                className={cn(
                  'bg-popover text-popover-foreground pointer-events-none absolute top-0 z-10 rounded-md border px-2.5 py-1.5 text-xs whitespace-nowrap shadow-md',
                  // Cerca de los bordes se alinea hacia adentro para no salirse del gráfico.
                  hovered < data.length * 0.15 ? 'translate-x-0' : hovered > data.length * 0.85 ? '-translate-x-full' : '-translate-x-1/2',
                )}
                style={{ left: `${((hovered + 0.5) / data.length) * 100}%` }}
                role="status"
              >
                <p className="text-muted-foreground first-letter:uppercase">{period.long(parseDay(active.date))}</p>
                <p className="font-semibold tabular-nums">{formatCurrency(active.revenue)}</p>
                <p className="text-muted-foreground tabular-nums">{METRICS.sales.format(active.sales)}</p>
              </div>
            )}

            {/* Eje X */}
            <div className="text-muted-foreground mt-2 flex gap-0.5 text-[11px]" aria-hidden>
              {data.map((day, index) => (
                <span key={day.date} className="flex-1 overflow-visible text-center whitespace-nowrap">
                  {xLabels.has(index) ? period.short(parseDay(day.date)) : ''}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Vista en tabla para lectores de pantalla */}
        <table className="sr-only">
          <caption>
            {label} por {period.noun}
          </caption>
          <thead>
            <tr>
              <th className="first-letter:uppercase">{period.noun}</th>
              <th>Ventas</th>
              <th>Ingresos</th>
            </tr>
          </thead>
          <tbody>
            {data.map((day) => (
              <tr key={day.date}>
                <td>{period.long(parseDay(day.date))}</td>
                <td>{day.sales}</td>
                <td>{formatCurrency(day.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

/** $ 1.200.000 → "$ 1,2 M" para que el eje no ocupe tanto. */
function compactCurrency(value: number) {
  return new Intl.NumberFormat(siteConfig.locale, {
    style: 'currency',
    currency: siteConfig.currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}
