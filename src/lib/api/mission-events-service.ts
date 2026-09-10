import { siteConfig } from '@/lib/site-config';

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

/** Chronologie métier d'une mission (API privée, acteurs autorisés uniquement). */
export async function listMissionEvents(demandeId: string): Promise<MissionEvent[]> {
  return apiFetch<MissionEvent[]>(`/demandes/${encodeURIComponent(demandeId)}/events`);
}