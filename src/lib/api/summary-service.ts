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
