'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { LoyaltySettingsDto, LoyaltySummary, StoreSettingsDto, StoreSettingsResponse } from '@admin/shared';
import { siteConfig } from '@/config/site';
import { apiClient } from '@/lib/api/client';

export const settingsKey = ['settings'] as const;

export function useStoreSettings() {
  return useQuery({
    queryKey: settingsKey,
    queryFn: () => apiClient.get<StoreSettingsResponse>('settings'),
    staleTime: 5 * 60_000,
  });
}

/** Nombre de la tienda para el menú: el guardado en Configuración, o el de las variables de entorno mientras carga. */
export function useStoreName() {
  return useStoreSettings().data?.storeName ?? siteConfig.name;
}

export function useUpdateStoreSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: StoreSettingsDto) => apiClient.patch<StoreSettingsResponse>('settings', data),
    onSuccess: (settings) => {
      queryClient.setQueryData(settingsKey, settings);
      toast.success('Configuración guardada');
    },
  });
}

export function useLoyaltySummary() {
  return useQuery({ queryKey: ['loyalty'], queryFn: () => apiClient.get<LoyaltySummary>('loyalty') });
}

export function useUpdateLoyaltySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: LoyaltySettingsDto) => apiClient.patch<StoreSettingsResponse>('settings/loyalty', data),
    onSuccess: async (settings) => {
      queryClient.setQueryData(settingsKey, settings);
      // Los puntos de cada cliente dependen de esta regla.
      await Promise.all(['loyalty', 'customers'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
      toast.success('Programa de puntos actualizado');
    },
  });
}
