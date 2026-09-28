import { siteConfig } from '@/lib/site-config';
import type { MissionEvent } from './mission-events-service';

export interface DeviceContext {
  id: string;
  name: string;
  slug: string;
}

export interface MissionSummary {
  demandeId: string;
  reference: string;
  status: string;
  category: string;
  description: string;
  device: {
    domain: DeviceContext | null;
    brand: DeviceContext | null;
    model: DeviceContext | null;
    problem: DeviceContext | null;
  };
  negotiationRequestedAt: string | null;
  finalAmount: number | null;
  events: MissionEvent[];
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
    mode?: 'CATALOG' | 'MANUAL';
    proposedIntervention?: string | null;
    justification?: string | null;
    notes?: string | null;
    technician: { id: string; firstName: string; lastName: string | null };
    createdAt: string;
  } | null;
  quote: {
    id: string;
    amount: number;
    currency: string;
    description: string;
    status: string;
    source?: string;
    breakdown?: {
      referencePrice: number | null;
      travelFee: number | null;
      serviceFee: number | null;
    } | null;
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

export async function getMissionSummary(demandeId: string): Promise<MissionSummary> {
  return apiFetch<MissionSummary>(`/demandes/${encodeURIComponent(demandeId)}/summary`);
}
