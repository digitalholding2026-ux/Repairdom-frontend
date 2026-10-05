import { siteConfig } from '@/lib/site-config';
import { toApiError } from './api-error';

export interface ChronologyEvent {
  type: string;
  label: string;
  createdAt: string;
}

export interface ChronologyPerson {
  id: string;
  firstName: string;
  lastName: string | null;
}

export interface ChronologyMission {
  id: string;
  reference: string;
  status: string;
  device: {
    domain: string | null;
    brand: string | null;
    model: string | null;
    problem: string | null;
  };
  technician: ChronologyPerson | null;
  client: ChronologyPerson | null;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  events: ChronologyEvent[];
}

export type ChronologyScope = 'active' | 'history';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${siteConfig.apiBaseUrl}${path}`, {
    credentials: 'include',
    ...init,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw toApiError(res, body);
  return body as T;
}

/** Centrale « Chronologies » : missions de l'utilisateur avec leurs
 *  événements embarqués, filtrage active/history côté backend. */
export async function listMyChronologies(
  scope: ChronologyScope = 'active',
): Promise<ChronologyMission[]> {
  return apiFetch<ChronologyMission[]>(
    `/demandes/chronologies/mine?scope=${encodeURIComponent(scope)}`,
  );
}