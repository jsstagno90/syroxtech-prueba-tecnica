'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ResourceApi } from './resource';

interface ResourceHooksConfig {
  /** Raíz de las query keys del recurso (ej. "categories"). */
  key: string;
  /** Otras queries que quedan desactualizadas cuando este recurso cambia. */
  invalidates?: string[];
  messages: { created: string; updated: string; deleted: string };
}

/**
 * Hooks de React Query para cualquier recurso CRUD: listado paginado, detalle,
 * opciones para selects y mutaciones con invalidación de caché y toasts.
 */
export function createResourceHooks<TItem, TCreate, TUpdate, TQuery extends object, TOption>(
  api: ResourceApi<TItem, TCreate, TUpdate, TQuery, TOption>,
  config: ResourceHooksConfig,
) {
  const keys = {
    all: [config.key] as const,
    list: (query: TQuery) => [config.key, 'list', query] as const,
    detail: (id: number) => [config.key, 'detail', id] as const,
    options: [config.key, 'options'] as const,
  };

  function useInvalidate() {
    const queryClient = useQueryClient();
    return () =>
      Promise.all(
        [config.key, ...(config.invalidates ?? [])].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
      );
  }

  return {
    keys,

    useList(query: TQuery) {
      return useQuery({
        queryKey: keys.list(query),
        queryFn: () => api.list(query),
        // Mientras carga la página siguiente se sigue viendo la actual (sin parpadeos).
        placeholderData: keepPreviousData,
      });
    },

    useDetail(id: number | undefined) {
      return useQuery({
        queryKey: keys.detail(id ?? 0),
        queryFn: () => api.get(id!),
        enabled: id !== undefined,
      });
    },

    useOptions() {
      return useQuery({ queryKey: keys.options, queryFn: api.options, staleTime: 60_000 });
    },

    useCreate() {
      const invalidate = useInvalidate();
      return useMutation({
        mutationFn: (data: TCreate) => api.create(data),
        onSuccess: async () => {
          await invalidate();
          toast.success(config.messages.created);
        },
      });
    },

    useUpdate() {
      const invalidate = useInvalidate();
      return useMutation({
        mutationFn: ({ id, data }: { id: number; data: TUpdate }) => api.update(id, data),
        onSuccess: async () => {
          await invalidate();
          toast.success(config.messages.updated);
        },
      });
    },

    useRemove() {
      const invalidate = useInvalidate();
      return useMutation({
        mutationFn: (id: number) => api.remove(id),
        onSuccess: async () => {
          await invalidate();
          toast.success(config.messages.deleted);
        },
        onError: (error) => toast.error(error.message),
      });
    },
  };
}
