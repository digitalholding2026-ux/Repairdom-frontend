import { siteConfig } from '@/lib/site-config';

export interface TechnicianProfile {
  id: string;
  city: string;
  categories: string[];
  isAvailable: boolean;
  avatarUrl: string | null;
  bio: string | null;
  experience: string | null;
  serviceDescription: string | null;
  specialties: string[];
  kycStatus: string;
  kycRejectionReason: string | null;
  completedInterventions: number;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string | null;
    phone: string | null;
    email: string;
    role: string;
  };
}

export interface PublicTechnicianProfile {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  city: string;
  categories: string[];
  specialties: string[];
  bio: string | null;
  experience: string | null;
  serviceDescription: string | null;
  isAvailable: boolean;
  kycStatus: string;
  completedInterventions: number;
  registeredAt: string;
}

export interface TechnicianDemande {
  id: string;
  reference: string;
  status: string;
  categoryId: string;
  categoryLabel: string;
  description: string;
  city: string;
  neighborhood: string | null;
  address: string | null;
  landmark: string | null;
  contactPhone: string | null;
  technicianId: string | null;
  technician: { id: string; firstName: string; lastName: string | null; phone: string | null; city: string | null } | null;
  scheduledAt: string | null;
  requestedMode: string;
  requestedAt: string | null;
  domain: DeviceContext | null;
  brand: DeviceContext | null;
  model: DeviceContext | null;
  problem: DeviceContext | null;
  negotiationRequestedAt: string | null;
  finalAmount: number | null;
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
  client?: { id: string; firstName: string; lastName: string | null } | null;
  clientReputation?: { averageRating: number | null; totalReviews: number } | null;
}

export interface DeviceContext {
  id: string;
  name: string;
  slug: string;
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
  avatarUrl?: string | null;
  bio?: string | null;
  experience?: string | null;
  serviceDescription?: string | null;
  specialties?: string[];
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

export async function uploadTechnicianAvatar(file: File): Promise<TechnicianProfile> {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch<TechnicianProfile>('/technician/profile/avatar', {
    method: 'POST',
    body: formData,
  });
}

export interface KycDocumentMetadata {
  id: string;
  type: string;
  originalName: string;
  createdAt: string;
}

export interface TechnicianKycOverview {
  status: string;
  kycRejectionReason: string | null;
  documents: KycDocumentMetadata[];
}

export async function getTechnicianKyc(): Promise<TechnicianKycOverview> {
  return apiFetch<TechnicianKycOverview>('/technician/kyc');
}

export async function uploadTechnicianKycDocument(
  file: File,
  type: string,
): Promise<TechnicianKycOverview> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  return apiFetch<TechnicianKycOverview>('/technician/kyc/documents', {
    method: 'POST',
    body: formData,
  });
}

export async function deleteTechnicianKycDocument(id: string): Promise<TechnicianKycOverview> {
  return apiFetch<TechnicianKycOverview>(`/technician/kyc/documents/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function getPublicTechnicianProfile(id: string): Promise<PublicTechnicianProfile> {
  return apiFetch<PublicTechnicianProfile>(`/technicians/${encodeURIComponent(id)}/profile`);
}

export async function listAvailableDemandes(): Promise<TechnicianDemande[]> {
  return apiFetch<TechnicianDemande[]>('/technician/available');
}

export async function listMyDemandes(): Promise<TechnicianDemande[]> {
  return apiFetch<TechnicianDemande[]>('/technician/my-demandes');
}

export async function listMyDemandeHistory(): Promise<TechnicianDemande[]> {
  return apiFetch<TechnicianDemande[]>('/technician/my-demandes/history');
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
  source?: string;
  catalogDiagnosticId?: string | null;
  catalogInterventionId?: string | null;
  breakdown?: {
    referencePrice: number | null;
    travelFee: number | null;
    serviceFee: number | null;
  } | null;
  createdAt: string;
}

/* ── Catalogue → mission (Sprint 8.1) ────────────────────────── */

export interface SuggestionIntervention {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  difficulty: string | null;
  estimatedTime: string | null;
  needsParts: boolean;
  partsNote: string | null;
}

export interface DiagnosticSuggestion {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  confidence: string | null;
  difficulty: string | null;
  estimatedTime: string | null;
  problem: {
    id: string;
    name: string;
    slug: string;
    brand: { id: string; name: string } | null;
    model: { id: string; name: string } | null;
  };
  interventions: SuggestionIntervention[];
  score: number;
}

export interface SuggestionResponse {
  suggestions: DiagnosticSuggestion[];
  total: number;
  demand: {
    domainId: string | null;
    brandId: string | null;
    modelId: string | null;
    problemId: string | null;
  };
}

export interface SelectDiagnosticResult {
  mode: 'CATALOG' | 'MANUAL';
  diagnostic: MissionDiagnostic;
  quote: MissionQuote | null;
}

export async function getDemandeSuggestions(demandeId: string): Promise<SuggestionResponse> {
  return apiFetch<SuggestionResponse>(
    `/demandes/${encodeURIComponent(demandeId)}/catalog/suggestions`,
  );
}

export async function selectDemandeDiagnostic(
  demandeId: string,
  data: {
    mode: 'CATALOG' | 'MANUAL';
    catalogDiagnosticId?: string;
    catalogInterventionId?: string;
    content?: string;
    recommendation?: string;
  },
): Promise<SelectDiagnosticResult> {
  return apiFetch<SelectDiagnosticResult>(
    `/demandes/${encodeURIComponent(demandeId)}/diagnostic/select`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
  );
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