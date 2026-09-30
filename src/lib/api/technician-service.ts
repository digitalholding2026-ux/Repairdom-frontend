import { siteConfig } from '@/lib/site-config';

export interface TechnicianProfile {
  id: string;
  city: string;
  /* Rattachement structuré (renvoyé par GET/PATCH /technician/profile).
   * Null quand le texte de ville ne correspond à aucune ServiceCity. */
  cityId: string | null;
  categories: string[];
  isAvailable: boolean;
  avatarUrl: string | null;
  bio: string | null;
  experience: string | null;
  serviceDescription: string | null;
  specialties: string[];
  kycStatus: string;
  kycRejectionReason: string | null;
  /* GPS V1 — dernière position transmise (null si jamais envoyée). */
  lastLatitude: number | null;
  lastLongitude: number | null;
  locationUpdatedAt: string | null;
  /* CHANTIER GPS P0/P1 — fraîcheur calculée CÔTÉ SERVEUR (fenêtre V2) :
   * l'UI ne déduit plus « à jour » de l'horloge du téléphone. */
  isLocationFresh: boolean | null;
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
  /* NULL pour les demandes multimédia sans texte (lire les médias). */
  description: string | null;
  /* IA-4.1 — équipement déclaré par le client (NULL historique/catalogue).
   * Information client, jamais un diagnostic. */
  equipmentType?: string | null;
  city: string;
  neighborhood: string | null;
  address: string | null;
  landmark: string | null;
  contactPhone: string | null;
  /* GPS V1 — null hors contexte assigné (opportunités) ; distanceMeters
   * renseigné uniquement sur le détail d'une mission assignée. */
  latitude?: number | null;
  longitude?: number | null;
  distanceMeters?: number | null;
  /* GPS V3 — déplacement temporaire (détail de MES missions uniquement :
   * coordonnées visibles par le technicien assigné, jamais exposées dans
   * les opportunités ni aux autres techniciens). */
  travel?: TechnicianTravelInfo | null;
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

/* GPS V3 — vue déplacement technicien (mission assignée, données propres
 * au technicien connecté). */
export interface TechnicianTravelInfo {
  enRoute: boolean;
  arrived: boolean;
  enRouteAt: string | null;
  arrivedAt: string | null;
  latitude: number | null;
  longitude: number | null;
  locationUpdatedAt: string | null;
  fresh: boolean;
  minutesSinceUpdate: number | null;
  distanceMeters: number | null;
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

/* Zones couvertes (Sprint 8.8.2) : le technicien ne touche que sa propre
 * couverture. PUT remplace l’intégralité de la liste (idempotent). */
export interface TechnicianCoverage {
  zoneId: string;
  name: string;
  slug: string;
  isActive: boolean;
  city: { id: string; name: string; slug: string };
}

export async function getTechnicianCoverage(): Promise<TechnicianCoverage[]> {
  return apiFetch<TechnicianCoverage[]>('/technician/coverage');
}

export async function updateTechnicianCoverage(zoneIds: string[]): Promise<TechnicianCoverage[]> {
  return apiFetch<TechnicianCoverage[]>('/technician/coverage', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zoneIds }),
  });
}

/* GPS V1 — transmission explicite et ponctuelle de la position
 * (PATCH /technician/location). Jamais de tracking en arrière-plan. */
export async function updateTechnicianLocation(
  latitude: number,
  longitude: number,
): Promise<TechnicianProfile> {
  return apiFetch<TechnicianProfile>('/technician/location', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude, longitude }),
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

/* GPS V3 — déplacement temporaire lié à la mission. Transmissions
 * explicites et ponctuelles uniquement (aucun tracking) ; les erreurs GPS
 * sont gérées par l'appelant et ne bloquent jamais la mission.
 * CHANTIER GPS P0/P1 — le départ accepte l'absence de coordonnées (« En
 * route » sans GPS : corps vide) ; `accuracy` optionnelle partout (fix
 * trop imprécis jamais stocké comme position fraîche côté backend). */
export async function startTravel(
  id: string,
  latitude?: number,
  longitude?: number,
  accuracy?: number | null,
): Promise<TechnicianDemande> {
  return apiFetch<TechnicianDemande>(`/technician/demandes/${encodeURIComponent(id)}/en-route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      latitude !== undefined && longitude !== undefined
        ? { latitude, longitude, ...(accuracy != null ? { accuracy } : {}) }
        : {},
    ),
  });
}

export async function refreshTravelLocation(
  id: string,
  latitude: number,
  longitude: number,
  accuracy?: number | null,
): Promise<TechnicianDemande> {
  return apiFetch<TechnicianDemande>(`/technician/demandes/${encodeURIComponent(id)}/location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      latitude,
      longitude,
      ...(accuracy != null ? { accuracy } : {}),
    }),
  });
}

export async function markTravelArrived(
  id: string,
  position?: { latitude: number; longitude: number; accuracy?: number | null },
): Promise<TechnicianDemande> {
  return apiFetch<TechnicianDemande>(`/technician/demandes/${encodeURIComponent(id)}/arrived`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(position ?? {}),
  });
}

/* Dépôt multimédia — URL signée éphémère d'une pièce jointe (technicien
 * ASSIGNÉ uniquement, 404 sinon). Lazy : appelée à l'ouverture du
 * lecteur uniquement, jamais préchargée en masse. */
export async function getTechnicianDemandeMediaFileUrl(
  demandeId: string,
  mediaId: string,
): Promise<{ url: string }> {
  return apiFetch<{ url: string }>(
    `/technician/demandes/${encodeURIComponent(demandeId)}/medias/${encodeURIComponent(mediaId)}/file`,
  );
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
  mode?: 'CATALOG' | 'MANUAL';
  proposedIntervention?: string | null;
  justification?: string | null;
  notes?: string | null;
  /* IA-3 — note vocale (lecture via URL signée, jamais d'URL persistée). */
  hasAudio?: boolean | null;
  /* IA-5 — correspondance catalogue analytique (consultation seule). */
  catalogMatch?: {
    classification: string;
    confidence: number | null;
    reason: string | null;
    catalogDiagnosticId: string | null;
    catalogDiagnosticName: string | null;
    createdAt: string;
  } | null;
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
  catalogDiagnostic?: {
    id: string;
    name: string;
  } | null;
  catalogIntervention?: {
    id: string;
    name: string;
  } | null;
  breakdown?: {
    referencePrice: number | null;
    travelFee: number | null;
    serviceFee: number | null;
  } | null;
  repair?: number | null;
  travel?: number | null;
  clientFee?: number | null;
  totalToDebit?: number | null;
  createdAt: string;
}

/* ── Catalogue → mission (Sprint 8.1) ────────────────────────── */

/* Barème technicien (fourchette min/ref/max + frais, sans historique) exposé
 * par GET /demandes/:id/catalog/suggestions — Phase A. */
export interface SuggestionPricing {
  interventionId: string;
  minPrice: number | null;
  referencePrice: number | null;
  maxPrice: number | null;
  travelFee: number | null;
  serviceFee: number | null;
  currency: string;
  priceMode: string;
}

export interface SuggestionIntervention {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  difficulty: string | null;
  estimatedTime: string | null;
  needsParts: boolean;
  partsNote: string | null;
  pricing?: SuggestionPricing | null;
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
    proposedIntervention?: string;
    justification?: string;
    notes?: string;
    audioStoragePath?: string;
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

/* ── IA-3 — note vocale du diagnostic libre ───────────────────────
 * Upload réel AVANT création (lié en transaction), lecture via URL
 * signée éphémère (assigné/propriétaire). Aucun appel IA. */

export interface UploadedDiagnosticAudio {
  storagePath: string;
  kind: 'AUDIO';
  name: string;
  mimeType: string;
  sizeBytes: number;
}

export async function uploadDiagnosticAudio(
  demandeId: string,
  file: File,
): Promise<UploadedDiagnosticAudio> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(
    `${siteConfig.apiBaseUrl}/demandes/${encodeURIComponent(demandeId)}/diagnostics/audio/upload`,
    { method: 'POST', credentials: 'include', body: formData },
  );
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const payload = body as { message?: string | string[]; code?: string } | null;
    const message = payload?.message;
    const text = Array.isArray(message) ? message.join(', ') : message;
    const code = typeof payload?.code === 'string' ? payload.code : null;
    throw new ApiError(text ?? `Erreur ${res.status}`, res.status, code);
  }
  return body as UploadedDiagnosticAudio;
}

export async function deleteDiagnosticAudio(demandeId: string, storagePath: string): Promise<void> {
  await apiFetch(`/demandes/${encodeURIComponent(demandeId)}/diagnostics/audio/upload`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storagePath }),
  });
}

export async function getDiagnosticAudioUrl(
  demandeId: string,
  diagnosticId: string,
): Promise<{ url: string }> {
  return apiFetch<{ url: string }>(
    `/demandes/${encodeURIComponent(demandeId)}/diagnostics/${encodeURIComponent(diagnosticId)}/audio`,
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