'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ImportProductsInput, ImportProductsResponse } from '@admin/shared';
import { apiClient } from '@/lib/api/client';

/** Valida (dryRun) o guarda una importación de productos. */
export function useImportProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ImportProductsInput) => apiClient.post<ImportProductsResponse>('products/import', input),
    onSuccess: async (result) => {
      if (result.dryRun) return;
      // Una importación puede tocar productos, marcas nuevas, conteos de categorías y el dashboard.
      await Promise.all(
        ['products', 'categories', 'brands', 'dashboard'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
      );
    },
  });
}
