'use client';

import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Inbox } from 'lucide-react';
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
}: DataTableProps<T>) {
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
                  {columns.map((column) => (
                    <TableCell key={column.id}>
                      <Skeleton className="h-5 w-full max-w-40" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="h-40 text-center">
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
                <TableCell colSpan={columns.length} className="h-48 text-center">
                  <div className="text-muted-foreground flex flex-col items-center gap-2">
                    <Inbox className="size-8 opacity-40" />
                    <p>{emptyMessage}</p>
                    {emptyAction}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={getRowKey(row)}>
                  {columns.map((column) => (
                    <TableCell key={column.id} className={column.className}>
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
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
