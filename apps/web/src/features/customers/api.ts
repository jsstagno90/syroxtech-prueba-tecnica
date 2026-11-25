import type { CustomerResponse } from '@admin/shared';
import { createResourceApi } from '@/lib/api/resource';
import { createResourceHooks } from '@/lib/api/resource-hooks';
import type { ListParams } from '@/lib/api/types';

export type CustomerSortKey = 'lastOrderAt' | 'ordersCount' | 'totalSpent' | 'name' | 'points';

export interface CustomerFilters {
  tierId?: number;
}

/** Solo lectura: los clientes salen de las ventas. */
export const customersApi = createResourceApi<CustomerResponse, never, never, ListParams<CustomerSortKey> & CustomerFilters>(
  'customers',
);

export const customerHooks = createResourceHooks(customersApi, {
  key: 'customers',
  messages: { created: '', updated: '', deleted: '' },
});
