import { siteConfig } from '@/lib/site-config';

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

class ApiError extends Error {
  status: number;
  code: string | null;
  constructor(message: string, status: number, code?: string | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code ?? null;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${siteConfig.apiBaseUrl}${path}`, {
    credentials: 'include',
    ...init,
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const payload = body as { message?: string | string[]; code?: string } | null;
    const message = payload?.message;
    const text = Array.isArray(message) ? message.join(', ') : message;
    const code = typeof payload?.code === 'string' ? payload.code : null;
    throw new ApiError(text ?? `Erreur ${res.status}`, res.status, code);
  }

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