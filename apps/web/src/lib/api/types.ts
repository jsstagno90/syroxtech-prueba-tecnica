import type { SortOrder } from '@admin/shared';

/** Parámetros de listado que arma useTableState y entiende la API. */
export interface ListParams<TSort extends string = string> {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: TSort;
  sortOrder: SortOrder;
}
