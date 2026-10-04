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
  neighborhood?: string;
  address?: string;
  landmark?: string;
  contactPhone?: string;
}

export interface DeviceContext {
  id: string;
  name: string;
  slug: string;
}

export interface CreateDemandeInput {
  categoryId: string;
  /* Dépôt multimédia : description textuelle optionnelle (vocal/vidéo /
   * photos). Backend : au moins un média exigé sans texte. */
  description?: string;
  /* Parcours « Autre appareil » : indice structuré (code de famille choisi
   * dans la liste du catalogue, jamais de texte libre). */
  equipmentFamily?: string;
  medias: Array<{ name: string; type: string; size: number; storagePath?: string }>;
  city: string;
  neighborhood?: string;
  address?: string;
  landmark?: string;
  contactPhone?: string;
  /* GPS V1 — position optionnelle (jamais exigée, jamais déduite). */
  latitude?: number;
  longitude?: number;
  requestedMode: RequestTimingMode;
  requestedAt?: string;
  domainId?: string;
  brandId?: string;
  modelId?: string;
  problemId?: string;
}

export interface TechnicianInfo {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  city: string | null;
}

/* GPS V3 — vue déplacement côté client (SANS coordonnées brutes) :
 * statut, fraîcheur et distance approximative uniquement. */
export interface ClientTravelInfo {
  enRoute: boolean;
  arrived: boolean;
  enRouteAt: string | null;
  arrivedAt: string | null;
  locationUpdatedAt: string | null;
  fresh: boolean;
  minutesSinceUpdate: number | null;
  distanceMeters: number | null;
}

/* GPS V4 — point technicien pour le RENDU carte (détail de LA mission
 * uniquement, déplacement actif ET position fraîche, jamais de chiffres
 * affichés côté UI). */
export interface ClientTravelMap {
  technician: { latitude: number; longitude: number } | null;
}

export interface CreateDemandeResult {
  id: string;
  reference: string;
  status: string;
  categoryId: string;
  categoryLabel: string;
  /* NULL pour les demandes multimédia sans texte (lire les médias). */
  description: string | null;
  city: string;
  neighborhood: string | null;
  address: string | null;
  landmark: string | null;
  contactPhone: string | null;
  /* GPS V1 — null pour les demandes créées sans position. */
  latitude: number | null;
  longitude: number | null;
  /* GPS V3 — déplacement temporaire (détail uniquement, jamais de
   * coordonnées brutes côté client). */
  travel?: ClientTravelInfo | null;
  /* GPS V4 — point carte (rendu marqueurs uniquement). */
  travelMap?: ClientTravelMap | null;
  technicianId: string | null;
  technician: TechnicianInfo | null;
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

export async function createDemande(input: CreateDemandeInput): Promise<CreateDemandeResult> {
  const result = await apiFetch<CreateDemandeResult>('/demandes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      categoryId: input.categoryId,
      // Description textuelle optionnelle (dépôt multimédia) : omise si vide.
      ...(input.description?.trim() ? { description: input.description.trim() } : {}),
      // Parcours « Autre appareil » : indice structuré (code validé backend).
      ...(input.equipmentFamily?.trim() ? { equipmentFamily: input.equipmentFamily.trim() } : {}),
      city: input.city,
      neighborhood: input.neighborhood || undefined,
      address: input.address || undefined,
      landmark: input.landmark || undefined,
      contactPhone: input.contactPhone || undefined,
      // GPS V1 — transmis uniquement si fini (jamais NaN/Infinity).
      latitude:
        typeof input.latitude === 'number' && Number.isFinite(input.latitude)
          ? input.latitude
          : undefined,
      longitude:
        typeof input.longitude === 'number' && Number.isFinite(input.longitude)
          ? input.longitude
          : undefined,
      requestedMode: input.requestedMode,
      requestedAt: input.requestedAt || undefined,
      domainId: input.domainId ?? undefined,
      brandId: input.brandId ?? undefined,
      modelId: input.modelId ?? undefined,
      problemId: input.problemId ?? undefined,
      medias: input.medias.map((m) => ({
        kind: resolveMediaKind(m.type),
        name: m.name,
        mimeType: m.type,
        sizeBytes: m.size,
        // Chemin d'upload réel (lié en transaction à la création).
        ...(m.storagePath ? { storagePath: m.storagePath } : {}),
      })),
    }),
  });

  return result;
}

export async function listMyDemandes(): Promise<DemandeListItem[]> {
  return apiFetch<DemandeListItem[]>('/demandes');
}

export async function listMyDemandeHistory(): Promise<DemandeListItem[]> {
  return apiFetch<DemandeListItem[]>('/demandes/my/history');
}

export async function getDemande(id: string): Promise<DemandeListItem> {
  return apiFetch<DemandeListItem>(`/demandes/${encodeURIComponent(id)}`);
}

/* ── Dépôt multimédia : upload réel AVANT création ───────────────────
 * Limites miroir backend (25 Mo / IMAGE-VIDEO-AUDIO, 5 fichiers max par
 * demande — comptés côté wizard). `kind` validé des deux côtés. */

export interface UploadedDemandeMedia {
  storagePath: string;
  kind: 'IMAGE' | 'VIDEO' | 'AUDIO';
  name: string;
  mimeType: string;
  sizeBytes: number;
}

async function mediaFetch<T>(path: string, init?: RequestInit): Promise<T> {
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

/** Upload d'un fichier (FormData) avant création de la demande. */
export async function uploadDemandeMedia(file: File, kind: 'IMAGE' | 'VIDEO' | 'AUDIO'): Promise<UploadedDemandeMedia> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('kind', kind);
  return mediaFetch<UploadedDemandeMedia>('/demandes/medias/upload', {
    method: 'POST',
    body: formData,
  });
}

/** Nettoyage best-effort d'un upload abandonné (demande non créée). */
export async function deleteUploadedDemandeMedia(storagePath: string): Promise<void> {
  await mediaFetch('/demandes/medias/upload', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storagePath }),
  });
}

/** URL signée éphémère de lecture (propriétaire ou assigné, 404 sinon).
 *  Lazy : appelée à l'ouverture du lecteur uniquement. */
export async function getDemandeMediaFileUrl(demandeId: string, mediaId: string): Promise<{ url: string }> {
  return apiFetch<{ url: string }>(
    `/demandes/${encodeURIComponent(demandeId)}/medias/${encodeURIComponent(mediaId)}/file`,
  );
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
  mode?: 'CATALOG' | 'MANUAL';
  proposedIntervention?: string | null;
  justification?: string | null;
  notes?: string | null;
  /* IA-3 — note vocale (lecture via URL signée, jamais d'URL persistée). */
  hasAudio?: boolean | null;
  /* IA-5 — correspondance catalogue analytique (jamais affichée au client). */
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
  catalogDiagnostic?: { id: string; name: string } | null;
  catalogIntervention?: { id: string; name: string } | null;
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

/* IA-3 — écoute de la note vocale (client propriétaire, URL signée
 * éphémère). Lazy : appelée à l'ouverture du lecteur uniquement. */
export async function getDiagnosticAudioUrl(
  demandeId: string,
  diagnosticId: string,
): Promise<{ url: string }> {
  return apiFetch<{ url: string }>(
    `/demandes/${encodeURIComponent(demandeId)}/diagnostics/${encodeURIComponent(diagnosticId)}/audio`,
  );
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

export interface NegotiationResult {
  demandeId: string;
  negotiationRequestedAt: string;
}

/** Le client déclenche l'ouverture du chat de négociation sur un tarif auto. */
export async function requestQuoteNegotiation(
  demandeId: string,
  quoteId: string,
): Promise<NegotiationResult> {
  return apiFetch<NegotiationResult>(
    `/demandes/${encodeURIComponent(demandeId)}/quotes/${encodeURIComponent(quoteId)}/negotiate`,
    { method: 'POST' },
  );
}

/* ── Litige post-intervention (DISPUTE) ──────────────────────────
 * Ouverture client (mission COMPLETED, un seul litige par mission) et
 * lecture partie prenante (client propriétaire OU technicien assigné,
 * null si aucun, 404 masqué sinon). Statuts et montants : backend seul. */

export type DisputeCategory = 'QUALITY' | 'INCOMPLETE' | 'PRICING' | 'BEHAVIOR' | 'OTHER';

export interface DemandeDispute {
  id: string;
  demandeId: string;
  category: string;
  description: string;
  status: string;
  resolution: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Ouvre un litige sur une mission terminée (CLIENT propriétaire, 201). */
export async function openDispute(
  demandeId: string,
  input: { category: DisputeCategory; description: string },
): Promise<DemandeDispute> {
  return apiFetch<DemandeDispute>(`/demandes/${encodeURIComponent(demandeId)}/dispute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: input.category, description: input.description.trim() }),
  });
}

/** Lit le litige d'une mission (null si aucun). */
export async function getDispute(demandeId: string): Promise<DemandeDispute | null> {
  return apiFetch<DemandeDispute | null>(`/demandes/${encodeURIComponent(demandeId)}/dispute`);
}
