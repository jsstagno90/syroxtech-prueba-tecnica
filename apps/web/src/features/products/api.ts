import type { CreateProductDto, ProductOption, ProductResponse, UpdateProductDto } from '@admin/shared';
import { createResourceApi } from '@/lib/api/resource';
import { createResourceHooks } from '@/lib/api/resource-hooks';
import type { ListParams } from '@/lib/api/types';

export type ProductSortKey = 'name' | 'price' | 'createdAt';

export interface ProductFilters {
  categoryId?: number;
  brandId?: number;
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
