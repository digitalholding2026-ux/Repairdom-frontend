import { siteConfig } from '@/lib/site-config';
import { toApiError } from './api-error';

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

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${siteConfig.apiBaseUrl}${path}`, {
    credentials: 'include',
    ...init,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw toApiError(res, body);
  return body as T;
}

export async function trackByReference(reference: string): Promise<PublicTracking> {
  return apiFetch<PublicTracking>(`/tracking/${encodeURIComponent(reference)}`);
}

/* CHANTIER NAVIGATION P1/P2 — format public `RD-XXXXXX` (miroir backend
 * `tracking-reference.ts`) : validé AVANT l'appel pour éviter une requête
 * inutile et afficher un message clair. Pur, sans dépendance. */
export function isValidTrackingReference(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /^RD-[A-HJ-NP-Z0-9]{6}$/.test(value.trim().toUpperCase());
}
