import { siteConfig } from '@/lib/site-config';

export interface PublicTracking {
  reference: string;
  status: string;
  category: string;
  timing: {
    mode: string;
    requestedAt: string | null;
  };
  scheduledAt: string | null;
  submittedAt: string;
  technicianAssigned: boolean;
  technicianVerified: boolean;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${siteConfig.apiBaseUrl}${path}`, {
    credentials: 'include',
    ...init,
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = (body as { message?: string | string[] } | null)?.message;
    const text = Array.isArray(message) ? message.join(', ') : message;
    throw new ApiError(text ?? `Erreur ${res.status}`, res.status);
  }

  return body as T;
}

export async function trackByReference(reference: string): Promise<PublicTracking> {
  return apiFetch<PublicTracking>(`/tracking/${encodeURIComponent(reference)}`);
}
