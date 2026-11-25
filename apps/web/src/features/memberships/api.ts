import type {
  CreateMembershipTierDto,
  MembershipTierResponse,
  UpdateMembershipTierDto,
} from '@admin/shared';
import { createResourceApi } from '@/lib/api/resource';
import { createResourceHooks } from '@/lib/api/resource-hooks';
import type { ListParams } from '@/lib/api/types';

export type MembershipSortKey = 'minSpent' | 'name';

export const membershipsApi = createResourceApi<
  MembershipTierResponse,
  CreateMembershipTierDto,
  UpdateMembershipTierDto,
  ListParams<MembershipSortKey>
>('memberships');

export const membershipHooks = createResourceHooks(membershipsApi, {
  key: 'memberships',
  // Cambiar un nivel cambia el nivel y los puntos de los clientes.
  invalidates: ['customers', 'loyalty'],
  messages: { created: 'Nivel creado', updated: 'Nivel actualizado', deleted: 'Nivel eliminado' },
});
