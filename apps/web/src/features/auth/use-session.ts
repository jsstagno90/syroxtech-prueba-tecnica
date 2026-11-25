'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { AuthUser, LoginInput } from '@admin/shared';
import { ApiError, apiClient } from '@/lib/api/client';

export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: () => apiClient.get<AuthUser>('auth/me'),
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: LoginInput) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = Array.isArray(payload?.message) ? payload.message[0] : payload?.message;
        throw new ApiError(response.status, message ?? 'No se pudo iniciar sesión');
      }
      return payload.user as AuthUser;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['session'], user);
      const next = new URLSearchParams(window.location.search).get('next');
      // Solo rutas internas: evita redirecciones abiertas a otros sitios.
      router.replace(next?.startsWith('/') && !next.startsWith('//') ? next : '/');
      router.refresh();
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: () => fetch('/api/auth/logout', { method: 'POST' }),
    // Recarga completa: así no queda en memoria ningún dato de la sesión anterior
    // (y ninguna query activa intenta refrescarse ya sin cookie).
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    onSuccess: () => window.location.assign('/login'),
  });
}
