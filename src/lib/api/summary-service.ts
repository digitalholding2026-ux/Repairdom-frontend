import { siteConfig } from '@/lib/site-config';

export interface MissionSummary {
  demandeId: string;
  reference: string;
  status: string;
  category: string;
  description: string;
  technician: {
    id: string;
    firstName: string;
    lastName: string | null;
    phone: string | null;
    city: string | null;
  } | null;
  scheduledAt: string | null;
  requestedMode: string;
  requestedAt: string | null;
  createdAt: string;
  diagnostic: {
    id: string;
    content: string;
    recommendation: string | null;
    technician: { id: string; firstName: string; lastName: string | null };
    createdAt: string;
  } | null;
  quote: {
    id: string;
    amount: number;
    currency: string;
    description: string;
    status: string;
  } | null;
  location: {
    city: string;
    neighborhood: string | null;
    address: string | null;
    landmark: string | null;
    contactPhone: string | null;
  };
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

export async function getMissionSummary(demandeId: string): Promise<MissionSummary> {
  return apiFetch<MissionSummary>(`/demandes/${encodeURIComponent(demandeId)}/summary`);
}
