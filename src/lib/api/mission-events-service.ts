import { siteConfig } from '@/lib/site-config';
import { toApiError } from './api-error';

export interface MissionEventActor {
  firstName: string;
  lastName: string | null;
}

export interface MissionEvent {
  id: string;
  type: string;
  label: string;
  fromStatus: string | null;
  toStatus: string | null;
  createdAt: string;
  actor: MissionEventActor | null;
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

/** Chronologie métier d'une mission (API privée, acteurs autorisés uniquement). */
export async function listMissionEvents(demandeId: string): Promise<MissionEvent[]> {
  return apiFetch<MissionEvent[]>(`/demandes/${encodeURIComponent(demandeId)}/events`);
}