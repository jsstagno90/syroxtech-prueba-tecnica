'use client';

import { Fragment, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, Inbox } from 'lucide-react';
import type { PaginationMeta, SortOrder } from '@admin/shared';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { DataTablePagination } from './data-table-pagination';
import type { Column } from './types';

export interface DataTableSort {
  sortBy?: string;
  sortOrder: SortOrder;
  toggleSort: (key: never) => void;
}

/** Filas que se despliegan debajo de otra (ej. subcategorías debajo de su categoría). */
export interface DataTableExpandable<T> {
  canExpand: (row: T) => boolean;
  /** Filas extra a mostrar cuando la fila está abierta. Reciben una columna vacía al inicio (la del botón). */
  renderRows: (row: T) => ReactNode;
  /** Para el aria-label del botón: "Mostrar subcategorías de Hombre". */
  label?: (row: T) => string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[] | undefined;
  meta?: PaginationMeta;
  isLoading?: boolean;
  /** Recargando en segundo plano (paginando, buscando): se atenúa la tabla. */
  isFetching?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  sort?: DataTableSort;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  getRowKey?: (row: T) => string | number;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  /** Barra superior (buscador, filtros). */
  toolbar?: ReactNode;
  /** Texto arriba de la tabla, ej. "Listado de ventas". */
  title?: string;
  expandable?: DataTableExpandable<T>;
}

/**
 * Tabla genérica con paginación y orden del lado del servidor.
 * Cada pantalla solo define sus columnas; carga, vacío, error y paginación ya vienen resueltos.
 */
export function DataTable<T>({
  columns,
  data,
  meta,
  isLoading,
  isFetching,
  isError,
  onRetry,
  sort,
  onPageChange,
  onPageSizeChange,
  getRowKey = (row) => (row as { id: number }).id,
  emptyMessage = 'No hay registros para mostrar.',
  emptyAction,
  toolbar,
  title,
  expandable,
}: DataTableProps<T>) {
  const [expanded, setExpanded] = useState<Set<string | number>>(new Set());
  const totalColumns = columns.length + (expandable ? 1 : 0);

  const toggleRow = (key: string | number) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="bg-card rounded-xl border shadow-sm">
      {(title || toolbar) && (
        <div className="flex flex-col gap-3 border-b p-4">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          {toolbar}
        </div>
      )}

      <div className={cn('transition-opacity', isFetching && !isLoading && 'opacity-60')} aria-busy={isFetching}>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {expandable && <TableHead className="w-10" aria-hidden />}
              {columns.map((column) => (
                <TableHead key={column.id} className={column.headerClassName}>
                  {column.sortKey && sort ? (
                    <SortButton column={column} sort={sort} />
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }, (_, index) => (
                <TableRow key={index} className="hover:bg-transparent">
                  {expandable && <TableCell />}
                  {columns.map((column) => (
                    <TableCell key={column.id}>
                      <Skeleton className="h-5 w-full max-w-40" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={totalColumns} className="h-40 text-center">
                  <p className="text-muted-foreground mb-3">No pudimos cargar los datos.</p>
                  {onRetry && (
                    <Button variant="outline" size="sm" onClick={onRetry}>
                      Reintentar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : !data?.length ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={totalColumns} className="h-48 text-center">
                  <div className="text-muted-foreground flex flex-col items-center gap-2">
                    <Inbox className="size-8 opacity-40" />
                    <p>{emptyMessage}</p>
                    {emptyAction}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => {
                const key = getRowKey(row);
                const canExpand = expandable?.canExpand(row) ?? false;
                const isOpen = canExpand && expanded.has(key);
                return (
                  <Fragment key={key}>
                    <TableRow data-state={isOpen ? 'open' : undefined}>
                      {expandable && (
                        <TableCell className="w-10 pr-0">
                          {canExpand && (
                            <ExpandToggle
                              open={isOpen}
                              onToggle={() => toggleRow(key)}
                              label={expandable.label?.(row) ?? 'Mostrar detalle'}
                            />
                          )}
                        </TableCell>
                      )}
                      {columns.map((column) => (
                        <TableCell key={column.id} className={column.className}>
                          {column.cell(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                    {isOpen && expandable!.renderRows(row)}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {meta && onPageChange && (
        <DataTablePagination meta={meta} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
      )}
    </div>
  );
}

/** Botón ▸ / ▾ para abrir y cerrar filas. */
export function ExpandToggle({ open, onToggle, label }: { open: boolean; onToggle: () => void; label: string }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="size-7"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={open ? label.replace(/^Mostrar/, 'Ocultar') : label}
    >
      <ChevronRight className={cn('size-4 transition-transform', open && 'rotate-90')} />
    </Button>
  );
}

function SortButton<T>({ column, sort }: { column: Column<T>; sort: DataTableSort }) {
  const active = sort.sortBy === column.sortKey;
  const Icon = !active ? ArrowUpDown : sort.sortOrder === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => sort.toggleSort(column.sortKey as never)}
      className={cn(
        'hover:text-foreground -ml-1 inline-flex items-center gap-1.5 rounded px-1 py-0.5 transition-colors',
        active && 'text-foreground',
      )}
      aria-label={`Ordenar por ${typeof column.header === 'string' ? column.header : column.id}`}
    >
      {column.header}
      <Icon className={cn('size-3.5', !active && 'opacity-40')} />
    </button>
  );
}
