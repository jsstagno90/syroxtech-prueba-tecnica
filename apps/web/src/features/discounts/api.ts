import type {
  CreateDiscountDto,
  DiscountOption,
  DiscountResponse,
  DiscountStatus,
  UpdateDiscountDto,
} from '@admin/shared';
import { createResourceApi } from '@/lib/api/resource';
import { createResourceHooks } from '@/lib/api/resource-hooks';
import type { ListParams } from '@/lib/api/types';

export type DiscountSortKey = 'code' | 'createdAt' | 'endsAt';

export const discountsApi = createResourceApi<
  DiscountResponse,
  CreateDiscountDto,
  UpdateDiscountDto,
  ListParams<DiscountSortKey> & { status?: DiscountStatus },
  DiscountOption
>('discounts');

export const discountHooks = createResourceHooks(discountsApi, {
  key: 'discounts',
  invalidates: ['stats'],
  messages: { created: 'Cupón creado', updated: 'Cupón actualizado', deleted: 'Cupón eliminado' },
});
