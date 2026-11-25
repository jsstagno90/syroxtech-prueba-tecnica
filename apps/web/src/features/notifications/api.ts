'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NotificationResponse, NotificationsSummary, NotificationType } from '@admin/shared';
import { apiClient } from '@/lib/api/client';
import { createResourceApi } from '@/lib/api/resource';
import { createResourceHooks } from '@/lib/api/resource-hooks';
import type { ListParams } from '@/lib/api/types';

export interface NotificationFilters {
  type?: NotificationType;
  unreadOnly?: boolean;
}

export const notificationsApi = createResourceApi<
  NotificationResponse,
  never,
  never,
  ListParams<'createdAt'> & NotificationFilters
>('notifications');

export const notificationHooks = createResourceHooks(notificationsApi, {
  key: 'notifications',
  messages: { created: '', updated: '', deleted: '' },
});

/** Para la campanita: se refresca sola cada minuto. */
export function useNotificationsSummary() {
  return useQuery({
    queryKey: ['notifications', 'summary'],
    queryFn: () => apiClient.get<NotificationsSummary>('notifications/summary'),
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<void>('notifications/read'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
