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
  supportEmail: string | null;
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
  return apiFetch<PublicPlatformSetting>('/settings/public');
}

/* Récupère tous les paramètres (admin). */
export async function getAdminSettings(): Promise<PlatformSetting> {
  return apiFetch<PlatformSetting>('/settings/admin');
}

/* Met à jour les paramètres (admin). */
export async function updateAdminSettings(
  input: UpdatePlatformSettingInput,
): Promise<PlatformSetting> {
  return apiFetch<PlatformSetting>('/settings/admin', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

/* Upload l’avatar admin (multipart/form-data). Retourne l’URL publique. */
export async function uploadAdminAvatar(file: File): Promise<{ adminAvatarUrl: string }> {
  const form = new FormData();
  form.append('file', file);
  return apiFetch<{ adminAvatarUrl: string }>('/settings/avatar', {
    method: 'POST',
    body: form,
  });
}
