import { siteConfig } from '@/lib/site-config';

export interface DeviceContext {
  name: string;
  slug: string;
}

export interface TrackingTimelineEntry {
  type: string;
  label: string;
  date: string | null;
}

export interface PublicTracking {
  reference: string;
  status: string;
  category: string;
  device: {
    domain: DeviceContext | null;
    brand: DeviceContext | null;
    model: DeviceContext | null;
    problem: DeviceContext | null;
  };
  timing: {
    mode: string;
    requestedAt: string | null;
  };
  scheduledAt: string | null;
  submittedAt: string;
  technicianAssigned: boolean;
  technicianVerified: boolean;
  timeline: TrackingTimelineEntry[];
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

export async function trackByReference(reference: string): Promise<PublicTracking> {
  return apiFetch<PublicTracking>(`/tracking/${encodeURIComponent(reference)}`);
}
