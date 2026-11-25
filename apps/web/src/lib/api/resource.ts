import type { PaginatedResponse } from '@admin/shared';
import { apiClient } from './client';

/**
 * Cliente CRUD genérico para un recurso REST de la API.
 * `createResourceApi<Category, CreateCategoryDto>('categories')` da list/get/create/update/remove
 * tipados sin repetir código por cada entidad.
 */
export function createResourceApi<TItem, TCreate, TUpdate = Partial<TCreate>, TQuery extends object = object, TOption = never>(
  resource: string,
) {
  return {
    list: (query: TQuery) => apiClient.get<PaginatedResponse<TItem>>(resource, { query }),
    options: () => apiClient.get<TOption[]>(`${resource}/options`),
    get: (id: number) => apiClient.get<TItem>(`${resource}/${id}`),
    create: (data: TCreate) => apiClient.post<TItem>(resource, data),
    update: (id: number, data: TUpdate) => apiClient.patch<TItem>(`${resource}/${id}`, data),
    remove: (id: number) => apiClient.delete(`${resource}/${id}`),
  };
}

export type ResourceApi<TItem, TCreate, TUpdate, TQuery extends object, TOption> = ReturnType<
  typeof createResourceApi<TItem, TCreate, TUpdate, TQuery, TOption>
>;
