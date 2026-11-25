import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  BulkDeleteProductsInput,
  BulkProductsResult,
  BulkUpdateProductsInput,
  CreateProductDto,
  ProductOption,
  ProductResponse,
  UpdateProductDto,
} from '@admin/shared';
import { apiClient } from '@/lib/api/client';
import { createResourceApi } from '@/lib/api/resource';
import { createResourceHooks } from '@/lib/api/resource-hooks';
import type { ListParams } from '@/lib/api/types';

export type ProductSortKey = 'name' | 'price' | 'createdAt';

export interface ProductFilters {
  categoryId?: number;
  /** Id de marca, o 'none' para los productos sin marca. */
  brandId?: number | 'none';
  isActive?: boolean;
}

export const productsApi = createResourceApi<
  ProductResponse,
  CreateProductDto,
  UpdateProductDto,
  ListParams<ProductSortKey> & ProductFilters,
  ProductOption
>('products');

export const productHooks = createResourceHooks(productsApi, {
  key: 'products',
  invalidates: ['categories', 'brands', 'dashboard'],
  messages: { created: 'Producto creado', updated: 'Producto actualizado', deleted: 'Producto eliminado' },
});

/* --------------------------- Edición masiva --------------------------- */

const BULK_INVALIDATES = ['products', 'categories', 'brands', 'dashboard'];

function useInvalidateProducts() {
  const queryClient = useQueryClient();
  return () => Promise.all(BULK_INVALIDATES.map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
}

/** Cambia categoría, marca o estado de varios productos. Los mensajes los muestra la pantalla. */
export function useBulkUpdateProducts() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: (body: BulkUpdateProductsInput) => apiClient.patch<BulkProductsResult>('products/bulk', body),
    onSuccess: () => invalidate(),
  });
}

export function useBulkDeleteProducts() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: (body: BulkDeleteProductsInput) => apiClient.post<BulkProductsResult>('products/bulk-delete', body),
    onSuccess: () => invalidate(),
  });
}
