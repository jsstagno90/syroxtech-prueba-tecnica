import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface BarListItem {
  key: string;
  label: ReactNode;
  value: number;
  /** Texto de la cifra (ej. "$ 1.200.000 · 12 ventas"). Por defecto, el número. */
  display?: ReactNode;
  /** Clase de color de la barra; por defecto el azul del gráfico principal. */
  barClassName?: string;
}

/**
 * Ranking con barras horizontales: el largo es relativo al mayor y la cifra va escrita,
 * así no depende del color ni de adivinar proporciones.
 */
export function BarList({ items, label, empty = 'Sin datos en el período.' }: { items: BarListItem[]; label: string; empty?: string }) {
  const max = Math.max(...items.map((item) => item.value), 0);
  if (!items.length || max === 0) return <p className="text-muted-foreground py-6 text-center text-sm">{empty}</p>;

  return (
    <ul className="grid gap-3" aria-label={label}>
      {items.map((item) => (
        <li key={item.key} className="grid gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{item.label}</span>
            <span className="text-muted-foreground shrink-0 tabular-nums">{item.display ?? item.value}</span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full" aria-hidden>
            <div
              className={cn('h-full rounded-full', item.barClassName ?? 'bg-blue-600 dark:bg-blue-400')}
              style={{ width: `${item.value === 0 ? 0 : Math.max((item.value / max) * 100, 2)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
