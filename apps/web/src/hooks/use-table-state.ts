'use client';

import { useCallback, useMemo, useState } from 'react';
import type { SortOrder } from '@admin/shared';
import { useDebouncedValue } from './use-debounced-value';

interface TableStateOptions<TSort extends string> {
  pageSize?: number;
  sortBy?: TSort;
  sortOrder?: SortOrder;
}

/**
 * Estado de una tabla con paginación, búsqueda y orden del lado del servidor.
 * Devuelve el `query` listo para mandarle a la API.
 */
export function useTableState<TSort extends string = string>(options: TableStateOptions<TSort> = {}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(options.pageSize ?? 10);
  const [searchInput, setSearchInputState] = useState('');
  const [sortBy, setSortBy] = useState<TSort | undefined>(options.sortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(options.sortOrder ?? 'asc');
  const search = useDebouncedValue(searchInput.trim());

  const setSearchInput = useCallback((value: string) => {
    setSearchInputState(value);
    setPage(1);
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  /** Click en una columna: asc → desc → sin orden. */
  const toggleSort = useCallback(
    (key: TSort) => {
      if (sortBy !== key) {
        setSortBy(key);
        setSortOrder('asc');
      } else if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortBy(undefined);
        setSortOrder('asc');
      }
      setPage(1);
    },
    [sortBy, sortOrder],
  );

  const query = useMemo(
    () => ({ page, pageSize, search: search || undefined, sortBy, sortOrder }),
    [page, pageSize, search, sortBy, sortOrder],
  );

  return {
    query,
    searchInput,
    setSearchInput,
    setPage,
    setPageSize,
    resetPage: () => setPage(1),
    sort: { sortBy, sortOrder, toggleSort },
  };
}
