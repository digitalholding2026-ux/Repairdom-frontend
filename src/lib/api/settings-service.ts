import { siteConfig } from '@/lib/site-config';
import { toApiError } from './api-error';

export interface PlatformSetting {
  id: string;
  adminName: string;
  adminWhatsApp: string;
  adminAvatarUrl: string | null;
  supportEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicPlatformSetting {
  adminName: string;
  adminWhatsApp: string;
  adminAvatarUrl: string | null;
}

export interface UpdatePlatformSettingInput {
  adminName?: string;
  adminWhatsApp?: string;
  adminAvatarUrl?: string | null;
  supportEmail?: string | null;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${siteConfig.apiBaseUrl}${path}`, {
    credentials: 'include',
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw toApiError(res, body);
  }

  return res.json();
}

/* Récupère les paramètres publics (client) : nom, numéro WhatsApp, avatar. */
export async function getPublicSettings(): Promise<PublicPlatformSetting> {
  return apiFetch<PublicPlatformSetting>('/api/settings/public');
}

/* Récupère tous les paramètres (admin). */
export async function getAdminSettings(): Promise<PlatformSetting> {
  return apiFetch<PlatformSetting>('/api/settings/admin');
}

/* Met à jour les paramètres (admin). */
export async function updateAdminSettings(
  input: UpdatePlatformSettingInput,
): Promise<PlatformSetting> {
  return apiFetch<PlatformSetting>('/api/settings/admin', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}
