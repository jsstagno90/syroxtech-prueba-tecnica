import type { ReactNode } from 'react';

/** Definición de una columna de DataTable. */
export interface Column<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Si está, la columna se puede ordenar por esta clave (la manda a la API como sortBy). */
  sortKey?: string;
  className?: string;
  headerClassName?: string;
}
