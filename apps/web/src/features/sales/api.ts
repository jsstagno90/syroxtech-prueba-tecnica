'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  SALE_STATUS_LABELS,
  type CreateSaleDto,
  type PaymentStatus,
  type SaleDetailResponse,
  type SaleResponse,
  type SaleStatus,
  type UpdateSaleStatusDto,
} from '@admin/shared';
import { apiClient } from '@/lib/api/client';
import { createResourceApi } from '@/lib/api/resource';
import { createResourceHooks } from '@/lib/api/resource-hooks';
import type { ListParams } from '@/lib/api/types';

export type SaleSortKey = 'createdAt' | 'total' | 'customerName';

export interface SaleFilters {
  status?: SaleStatus;
  paymentStatus?: PaymentStatus;
}

// Las ventas no se editan ni se borran: se crean y avanzan de estado.
export const salesApi = {
  ...createResourceApi<SaleResponse, CreateSaleDto, never, ListParams<SaleSortKey> & SaleFilters>('sales'),
  getDetail: (id: number) => apiClient.get<SaleDetailResponse>(`sales/${id}`),
  updateStatus: (id: number, data: UpdateSaleStatusDto) =>
    apiClient.patch<SaleDetailResponse>(`sales/${id}/status`, data),
};

export const saleHooks = createResourceHooks(salesApi, {
  key: 'sales',
  invalidates: ['dashboard'],
  messages: { created: 'Venta generada', updated: 'Venta actualizada', deleted: 'Venta eliminada' },
});

/** El detalle trae ítems e historial (por eso se tipa aparte del listado). */
export function useSaleDetail(id: number | undefined) {
  return useQuery({
    queryKey: saleHooks.keys.detail(id ?? 0),
    queryFn: () => salesApi.getDetail(id!),
    enabled: id !== undefined,
  });
}

export function useUpdateSaleStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateSaleStatusDto }) => salesApi.updateStatus(id, data),
    onSuccess: async (sale) => {
      queryClient.setQueryData(saleHooks.keys.detail(sale.id), sale);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: saleHooks.keys.all }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
      toast.success(`Venta #${sale.orderNumber}: ${SALE_STATUS_LABELS[sale.status]}`);
    },
    onError: (error) => toast.error(error.message),
  });
}
