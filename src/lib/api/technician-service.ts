import { siteConfig } from '@/lib/site-config';

export interface TechnicianProfile {
  id: string;
  city: string;
  categories: string[];
  isAvailable: boolean;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string | null;
    phone: string | null;
    email: string;
    role: string;
  };
}

export interface TechnicianDemande {
  id: string;
  reference: string;
  status: string;
  categoryId: string;
  categoryLabel: string;
  description: string;
  city: string;
  address: string | null;
  technicianId: string | null;
  technician: { id: string; firstName: string; lastName: string | null; phone: string | null; city: string | null } | null;
  scheduledAt: string | null;
  requestedMode: string;
  requestedAt: string | null;
  medias: Array<{
    id: string;
    kind: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    stored: boolean;
  }>;
  mediaPersisted: boolean;
  storageStatus: string;
  createdAt: string;
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

export async function getTechnicianProfile(): Promise<TechnicianProfile> {
  return apiFetch<TechnicianProfile>('/technician/profile');
}

export async function updateTechnicianProfile(data: {
  city?: string;
  categories?: string[];
  isAvailable?: boolean;
}): Promise<TechnicianProfile> {
  return apiFetch<TechnicianProfile>('/technician/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateTechnicianAvailability(isAvailable: boolean): Promise<TechnicianProfile> {
  return apiFetch<TechnicianProfile>('/technician/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isAvailable }),
  });
}

export async function listAvailableDemandes(): Promise<TechnicianDemande[]> {
  return apiFetch<TechnicianDemande[]>('/technician/available');
}

export async function listMyDemandes(): Promise<TechnicianDemande[]> {
  return apiFetch<TechnicianDemande[]>('/technician/my-demandes');
}

export async function getTechnicianDemande(id: string): Promise<TechnicianDemande> {
  return apiFetch<TechnicianDemande>(`/technician/demandes/${encodeURIComponent(id)}`);
}

export async function acceptDemande(id: string): Promise<TechnicianDemande> {
  return apiFetch<TechnicianDemande>(`/technician/demandes/${encodeURIComponent(id)}/accept`, {
    method: 'POST',
  });
}

export async function updateTechnicianDemandeStatus(
  id: string,
  status: string,
  scheduledAt?: string,
): Promise<TechnicianDemande> {
  return apiFetch<TechnicianDemande>(`/technician/demandes/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, scheduledAt }),
  });
}

export interface ConversationMessage {
  id: string;
  content: string;
  senderId: string;
  sender: { id: string; firstName: string; lastName: string | null };
  createdAt: string;
}

export interface MissionDiagnostic {
  id: string;
  content: string;
  recommendation: string | null;
  technicianId: string;
  technician: { id: string; firstName: string; lastName: string | null };
  createdAt: string;
}

export interface MissionQuote {
  id: string;
  demandeId: string;
  technicianId: string;
  amount: number;
  currency: string;
  description: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

export async function listDemandeMessages(demandeId: string): Promise<ConversationMessage[]> {
  return apiFetch<ConversationMessage[]>(`/demandes/${encodeURIComponent(demandeId)}/messages`);
}

export async function sendDemandeMessage(
  demandeId: string,
  content: string,
): Promise<ConversationMessage> {
  return apiFetch<ConversationMessage>(`/demandes/${encodeURIComponent(demandeId)}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
}

export async function listDemandeDiagnostics(demandeId: string): Promise<MissionDiagnostic[]> {
  return apiFetch<MissionDiagnostic[]>(`/demandes/${encodeURIComponent(demandeId)}/diagnostics`);
}

export async function createDemandeDiagnostic(
  demandeId: string,
  data: { content: string; recommendation?: string },
): Promise<MissionDiagnostic> {
  return apiFetch<MissionDiagnostic>(`/demandes/${encodeURIComponent(demandeId)}/diagnostic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: data.content, recommendation: data.recommendation || undefined }),
  });
}

export async function listDemandeQuotes(demandeId: string): Promise<MissionQuote[]> {
  return apiFetch<MissionQuote[]>(`/demandes/${encodeURIComponent(demandeId)}/quotes`);
}

export async function createDemandeQuote(
  demandeId: string,
  data: { amount: number; description: string; currency?: string },
): Promise<MissionQuote> {
  return apiFetch<MissionQuote>(`/demandes/${encodeURIComponent(demandeId)}/quotes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: data.amount,
      description: data.description,
      currency: data.currency || undefined,
    }),
  });
}