import { siteConfig } from '@/lib/site-config';
import { toApiError } from './api-error';

export interface TrackingTimelineEntry {
  type: string;
  label: string;
  date: string | null;
}

export interface PublicTracking {
  reference: string;
  status: string;
  category: string;
  model: string | null;
  problem: string | null;
  price: number | null;
  createdAt: string;
  address: string | null;
  city: string | null;
  contactPhone: string | null;
  timeline: TrackingTimelineEntry[];
}

/* Résultat de la recherche par numéro de téléphone (client invité). */
export interface TrackSearchResult {
  id: string;
  trackingToken: string | null;
  reference: string;
  service: string;
  status: string;
  createdAt: string;
  price: number | null;
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

export async function trackByReference(reference: string, phone?: string): Promise<PublicTracking> {
  const qs = phone ? `?phone=${encodeURIComponent(phone)}` : '';
  return apiFetch<PublicTracking>(`/demandes/tracking/reference/${encodeURIComponent(reference)}${qs}`);
}

/* Suivi public par token (client invité, pas de compte) : le token
 * `trackingToken` (UUID v4) est passé dans l'URL. Aucune authentification
 * requise. */
export async function trackByToken(token: string): Promise<PublicTracking> {
  return apiFetch<PublicTracking>(`/tracking/token/${encodeURIComponent(token)}`);
}

/* CHANTIER NAVIGATION P1/P2 — format public `RD-XXXXXX` (miroir backend
 * `tracking-reference.ts`) : validé AVANT l'appel pour éviter une requête
 * inutile et afficher un message clair. Pur, sans dépendance. */
export function isValidTrackingReference(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /^RD-[A-HJ-NP-Z0-9]{6}$/.test(value.trim().toUpperCase());
}

/* Recherche publique des demandes par numéro de téléphone (client invité,
 * pas de compte). Aucun paramètre d'authentification requis. */
export async function trackByPhone(phone: string): Promise<TrackSearchResult[]> {
  return apiFetch<TrackSearchResult[]>(`/tracking/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
}
