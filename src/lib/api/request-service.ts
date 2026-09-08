import { siteConfig } from '@/lib/site-config';
import type { RequestTimingMode } from '@/lib/request-timing';

export interface RequestMedia {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface RequestLocation {
  city: string;
  address?: string;
}

export interface CreateDemandeInput {
  categoryId: string;
  description: string;
  medias: Array<{ name: string; type: string; size: number }>;
  city: string;
  address?: string;
  requestedMode: RequestTimingMode;
  requestedAt?: string;
}

export interface TechnicianInfo {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  city: string | null;
}

export interface CreateDemandeResult {
  id: string;
  reference: string;
  status: string;
  categoryId: string;
  categoryLabel: string;
  description: string;
  city: string;
  address: string | null;
  technicianId: string | null;
  technician: TechnicianInfo | null;
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

export type DemandeListItem = CreateDemandeResult;

const MEDIA_KIND_MAP: Record<string, string> = {
  'image/': 'IMAGE',
  'video/': 'VIDEO',
  'audio/': 'AUDIO',
};

function resolveMediaKind(mimeType: string): string {
  for (const [prefix, kind] of Object.entries(MEDIA_KIND_MAP)) {
    if (mimeType.startsWith(prefix)) return kind;
  }
  return 'IMAGE';
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

export async function createDemande(input: CreateDemandeInput): Promise<CreateDemandeResult> {
  const result = await apiFetch<CreateDemandeResult>('/demandes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      categoryId: input.categoryId,
      description: input.description,
      city: input.city,
      address: input.address || undefined,
      requestedMode: input.requestedMode,
      requestedAt: input.requestedAt || undefined,
      medias: input.medias.map((m) => ({
        kind: resolveMediaKind(m.type),
        name: m.name,
        mimeType: m.type,
        sizeBytes: m.size,
      })),
    }),
  });

  return result;
}

export async function listMyDemandes(): Promise<DemandeListItem[]> {
  return apiFetch<DemandeListItem[]>('/demandes');
}

export async function getDemande(id: string): Promise<DemandeListItem> {
  return apiFetch<DemandeListItem>(`/demandes/${encodeURIComponent(id)}`);
}

export async function updateDemandeStatus(id: string, status: string): Promise<DemandeListItem> {
  return apiFetch<DemandeListItem>(`/demandes/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
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

export function formatQuoteAmount(quote: Pick<MissionQuote, 'amount' | 'currency'>): string {
  return `${quote.amount.toLocaleString('fr-FR')} ${quote.currency}`;
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

export async function listDemandeQuotes(demandeId: string): Promise<MissionQuote[]> {
  return apiFetch<MissionQuote[]>(`/demandes/${encodeURIComponent(demandeId)}/quotes`);
}

export async function respondToQuote(
  demandeId: string,
  quoteId: string,
  action: 'accept' | 'reject',
): Promise<MissionQuote> {
  return apiFetch<MissionQuote>(
    `/demandes/${encodeURIComponent(demandeId)}/quotes/${encodeURIComponent(quoteId)}/${action}`,
    { method: 'POST' },
  );
}
