import type { BrandOption, BrandResponse, CreateBrandDto, UpdateBrandDto } from '@admin/shared';
import { createResourceApi } from '@/lib/api/resource';
import { createResourceHooks } from '@/lib/api/resource-hooks';
import type { ListParams } from '@/lib/api/types';

export type BrandSortKey = 'name' | 'createdAt';

export const brandsApi = createResourceApi<BrandResponse, CreateBrandDto, UpdateBrandDto, ListParams<BrandSortKey>, BrandOption>(
  'brands',
);

export const brandHooks = createResourceHooks(brandsApi, {
  key: 'brands',
  invalidates: ['products', 'dashboard'],
  messages: { created: 'Marca creada', updated: 'Marca actualizada', deleted: 'Marca eliminada' },
});
