import { siteConfig } from '@/lib/site-config';
import { toApiError } from './api-error';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  demandeId: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  total: number;
  unreadCount: number;
  items: AppNotification[];
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${siteConfig.apiBaseUrl}${path}`, {
    credentials: 'include',
    ...init,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw toApiError(res, body);
  return body as T;
}

export async function listNotifications(): Promise<NotificationsResponse> {
  return apiFetch<NotificationsResponse>('/notifications/mine');
}

export async function getNotificationUnreadCount(): Promise<{ unreadCount: number }> {
  return apiFetch<{ unreadCount: number }>('/notifications/unread-count');
}

export async function markNotificationRead(id: string): Promise<{ id: string; read: boolean }> {
  return apiFetch<{ id: string; read: boolean }>(`/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
  });
}

export async function markAllNotificationsRead(): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>('/notifications/read-all', { method: 'PATCH' });
}