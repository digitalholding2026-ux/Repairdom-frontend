import { siteConfig } from '@/lib/site-config';

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

/** Centrale « Chronologies » : missions de l'utilisateur avec leurs
 *  événements embarqués, filtrage active/history côté backend. */
export async function listMyChronologies(
  scope: ChronologyScope = 'active',
): Promise<ChronologyMission[]> {
  return apiFetch<ChronologyMission[]>(
    `/demandes/chronologies/mine?scope=${encodeURIComponent(scope)}`,
  );
}