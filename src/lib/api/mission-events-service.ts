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

/** Chronologie métier d'une mission (API privée, acteurs autorisés uniquement). */
export async function listMissionEvents(demandeId: string): Promise<MissionEvent[]> {
  return apiFetch<MissionEvent[]>(`/demandes/${encodeURIComponent(demandeId)}/events`);
}