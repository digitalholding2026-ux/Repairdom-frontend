import { siteConfig } from '@/lib/site-config';

export interface AdminKycFolder {
  technicianId: string;
  firstName: string;
  lastName: string | null;
  city: string;
  categories: string[];
  kycStatus: string;
  submittedAt: string | null;
  documentCount: number;
}

export interface AdminKycFolderList {
  items: AdminKycFolder[];
}

export interface AdminKycDocument {
  id: string;
  type: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface AdminKycReview {
  reviewerId: string;
  reviewerName: string;
  previousStatus: string;
  newStatus: string;
  reason: string | null;
  createdAt: string;
}

export interface AdminKycDetail {
  technician: {
    id: string;
    firstName: string;
    lastName: string | null;
    phone: string | null;
    avatarUrl: string | null;
    city: string;
    categories: string[];
    specialties: string[];
    experience: string | null;
    serviceDescription: string | null;
    bio: string | null;
    isAvailable: boolean;
    kycStatus: string;
    kycRejectionReason: string | null;
    completedInterventions: number;
    registeredAt: string;
  };
  documents: AdminKycDocument[];
  reviews: AdminKycReview[];
}

export interface AdminKycDocumentUrl {
  url: string;
  expiresIn: number;
  mimeType: string;
  originalName: string;
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

export async function getAdminKycFolders(status: string): Promise<AdminKycFolderList> {
  return apiFetch<AdminKycFolderList>(`/admin/kyc?status=${encodeURIComponent(status)}`);
}

export async function getAdminKycFolder(technicianId: string): Promise<AdminKycDetail> {
  return apiFetch<AdminKycDetail>(`/admin/kyc/${encodeURIComponent(technicianId)}`);
}

export async function getAdminKycDocumentUrl(
  technicianId: string,
  documentId: string,
): Promise<AdminKycDocumentUrl> {
  return apiFetch<AdminKycDocumentUrl>(
    `/admin/kyc/${encodeURIComponent(technicianId)}/documents/${encodeURIComponent(documentId)}/url`,
  );
}

export async function updateAdminKycStatus(
  technicianId: string,
  status: 'VERIFIED' | 'REJECTED',
  reason?: string,
): Promise<AdminKycDetail> {
  return apiFetch<AdminKycDetail>(
    `/admin/kyc/${encodeURIComponent(technicianId)}/status`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason: reason?.trim() || undefined }),
    },
  );
}

/* ── Catalog ──────────────────────────────────────────────────── */

export interface CatalogDomain {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  _count?: { problems: number; brands?: number };
}

export interface CatalogBrand {
  id: string;
  domainId: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  _count?: { models: number };
}

export interface CatalogModel {
  id: string;
  brandId: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  _count?: { problems: number };
}

export interface CatalogBrandDetail extends CatalogBrand {
  domain: CatalogDomain;
  models: CatalogModel[];
}

export interface CatalogProblem {
  id: string;
  domainId: string;
  brandId: string | null;
  modelId: string | null;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  brand?: { id: string; name: string } | null;
  model?: { id: string; name: string } | null;
  _count?: { diagnostics: number };
}

export interface CatalogDiagnostic {
  id: string;
  problemId: string;
  name: string;
  slug: string;
  description: string | null;
  confidence: string | null;
  difficulty: string | null;
  estimatedTime: string | null;
  internalNotes: string | null;
  isActive: boolean;
  sortOrder: number;
  _count?: { interventions: number };
}

export interface CatalogIntervention {
  id: string;
  diagnosticId: string;
  name: string;
  slug: string;
  description: string | null;
  difficulty: string | null;
  estimatedTime: string | null;
  needsParts: boolean;
  partsNote: string | null;
  isActive: boolean;
  sortOrder: number;
  pricing: CatalogPricing | null;
}

export interface CatalogPricing {
  id: string;
  interventionId: string;
  minPrice: number | null;
  referencePrice: number | null;
  maxPrice: number | null;
  travelFee: number | null;
  serviceFee: number | null;
  currency: string;
  priceMode: string;
  isActive: boolean;
  history?: CatalogPricingHistory[];
}

export interface CatalogPricingHistory {
  id: string;
  pricingId: string;
  adminId: string;
  admin: { id: string; firstName: string; lastName: string | null } | null;
  previousValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  reason: string | null;
  createdAt: string;
}

export interface CatalogDomainDetail extends CatalogDomain {
  problems: CatalogProblem[];
  brands: CatalogBrand[];
}

export interface CatalogModelDetail extends CatalogModel {
  brand: CatalogBrand & { domain: CatalogDomain };
}

export interface CatalogProblemDetail extends CatalogProblem {
  domain: CatalogDomain;
  brand?: CatalogBrand | null;
  model?: CatalogModel | null;
  diagnostics: CatalogDiagnostic[];
}

export interface CatalogDiagnosticDetail extends CatalogDiagnostic {
  problem: CatalogProblemDetail;
  interventions: CatalogIntervention[];
}

export interface CatalogInterventionDetail extends CatalogIntervention {
  diagnostic: CatalogDiagnosticDetail;
}

async function catalogFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return apiFetch<T>(path, init);
}

function jsonBody(data: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}

function patchBody(data: unknown): RequestInit {
  return {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}

function deleteBody(): RequestInit {
  return { method: 'DELETE' };
}

/* Domains */
export function listDomains(): Promise<CatalogDomain[]> {
  return catalogFetch<CatalogDomain[]>('/admin/catalog/domains');
}

export function getDomain(id: string): Promise<CatalogDomainDetail> {
  return catalogFetch<CatalogDomainDetail>(`/admin/catalog/domains/${encodeURIComponent(id)}`);
}

export function createDomain(data: { name: string; slug: string; description?: string; icon?: string; category?: string }): Promise<CatalogDomain> {
  return catalogFetch<CatalogDomain>('/admin/catalog/domains', jsonBody(data));
}

export function updateDomain(id: string, data: Record<string, unknown>): Promise<CatalogDomain> {
  return catalogFetch<CatalogDomain>(`/admin/catalog/domains/${encodeURIComponent(id)}`, patchBody(data));
}

/* Problems */
export function listProblems(
  domainId: string,
  opts?: { brandId?: string; modelId?: string },
): Promise<CatalogProblem[]> {
  const params = new URLSearchParams();
  if (opts?.brandId) params.set('brandId', opts.brandId);
  if (opts?.modelId) params.set('modelId', opts.modelId);
  const query = params.toString();
  return catalogFetch<CatalogProblem[]>(
    `/admin/catalog/domains/${encodeURIComponent(domainId)}/problems${query ? `?${query}` : ''}`,
  );
}

export function getProblem(id: string): Promise<CatalogProblemDetail> {
  return catalogFetch<CatalogProblemDetail>(`/admin/catalog/problems/${encodeURIComponent(id)}`);
}

export function createProblem(data: {
  domainId: string;
  brandId?: string;
  modelId?: string;
  name: string;
  slug: string;
  description?: string;
}): Promise<CatalogProblem> {
  return catalogFetch<CatalogProblem>('/admin/catalog/problems', jsonBody(data));
}

export function updateProblem(id: string, data: Record<string, unknown>): Promise<CatalogProblem> {
  return catalogFetch<CatalogProblem>(`/admin/catalog/problems/${encodeURIComponent(id)}`, patchBody(data));
}

/* Brands */
export function listBrands(domainId: string): Promise<CatalogBrand[]> {
  return catalogFetch<CatalogBrand[]>(`/admin/catalog/domains/${encodeURIComponent(domainId)}/brands`);
}

export function getBrand(id: string): Promise<CatalogBrandDetail> {
  return catalogFetch<CatalogBrandDetail>(`/admin/catalog/brands/${encodeURIComponent(id)}`);
}

export function createBrand(data: { domainId: string; name: string; slug: string; description?: string }): Promise<CatalogBrand> {
  return catalogFetch<CatalogBrand>('/admin/catalog/brands', jsonBody(data));
}

export function updateBrand(id: string, data: Record<string, unknown>): Promise<CatalogBrand> {
  return catalogFetch<CatalogBrand>(`/admin/catalog/brands/${encodeURIComponent(id)}`, patchBody(data));
}

/* Models */
export function listModels(brandId: string): Promise<CatalogModel[]> {
  return catalogFetch<CatalogModel[]>(`/admin/catalog/brands/${encodeURIComponent(brandId)}/models`);
}

export function getModel(id: string): Promise<CatalogModelDetail> {
  return catalogFetch<CatalogModelDetail>(`/admin/catalog/models/${encodeURIComponent(id)}`);
}

export function createModel(data: { brandId: string; name: string; slug: string; description?: string }): Promise<CatalogModel> {
  return catalogFetch<CatalogModel>('/admin/catalog/models', jsonBody(data));
}

export function updateModel(id: string, data: Record<string, unknown>): Promise<CatalogModel> {
  return catalogFetch<CatalogModel>(`/admin/catalog/models/${encodeURIComponent(id)}`, patchBody(data));
}

/* Diagnostics */
export function listDiagnostics(problemId: string): Promise<CatalogDiagnostic[]> {
  return catalogFetch<CatalogDiagnostic[]>(`/admin/catalog/problems/${encodeURIComponent(problemId)}/diagnostics`);
}

export function getDiagnostic(id: string): Promise<CatalogDiagnosticDetail> {
  return catalogFetch<CatalogDiagnosticDetail>(`/admin/catalog/diagnostics/${encodeURIComponent(id)}`);
}

export function createDiagnostic(data: { problemId: string; name: string; slug: string; description?: string; difficulty?: string; estimatedTime?: string }): Promise<CatalogDiagnostic> {
  return catalogFetch<CatalogDiagnostic>('/admin/catalog/diagnostics', jsonBody(data));
}

export function updateDiagnostic(id: string, data: Record<string, unknown>): Promise<CatalogDiagnostic> {
  return catalogFetch<CatalogDiagnostic>(`/admin/catalog/diagnostics/${encodeURIComponent(id)}`, patchBody(data));
}

/* Interventions */
export function listInterventions(diagnosticId: string): Promise<CatalogIntervention[]> {
  return catalogFetch<CatalogIntervention[]>(`/admin/catalog/diagnostics/${encodeURIComponent(diagnosticId)}/interventions`);
}

export function getIntervention(id: string): Promise<CatalogInterventionDetail> {
  return catalogFetch<CatalogInterventionDetail>(`/admin/catalog/interventions/${encodeURIComponent(id)}`);
}

export function createIntervention(data: { diagnosticId: string; name: string; slug: string; description?: string; difficulty?: string; estimatedTime?: string; needsParts?: boolean }): Promise<CatalogIntervention> {
  return catalogFetch<CatalogIntervention>('/admin/catalog/interventions', jsonBody(data));
}

export function updateIntervention(id: string, data: Record<string, unknown>): Promise<CatalogIntervention> {
  return catalogFetch<CatalogIntervention>(`/admin/catalog/interventions/${encodeURIComponent(id)}`, patchBody(data));
}

/* Pricing */
export function getPricing(interventionId: string): Promise<CatalogPricing> {
  return catalogFetch<CatalogPricing>(`/admin/catalog/interventions/${encodeURIComponent(interventionId)}/pricing`);
}

/* IA-2 — barèmes par diagnostic (lecture seule, ADMIN) : agrégation
 * min/référence/max sur les pricings actifs (voir backend
 * `CatalogService.listDiagnosticScales`). */

export interface DiagnosticScaleIntervention {
  id: string;
  name: string;
  isActive: boolean;
  pricing: {
    minPrice: number | null;
    referencePrice: number | null;
    maxPrice: number | null;
    currency: string;
    isActive: boolean;
    updatedAt: string;
  } | null;
}

export interface DiagnosticScale {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  updatedAt: string;
  problem: { id: string; name: string; slug: string };
  domain: { id: string; name: string; slug: string };
  scale: {
    min: number | null;
    reference: number | null;
    max: number | null;
    currency: string;
    pricedInterventions: number;
    totalInterventions: number;
  };
  hasActiveScale: boolean;
  lastChangeAt: string | null;
  interventions: DiagnosticScaleIntervention[];
}

export interface DiagnosticScaleListQuery {
  search?: string;
  domainId?: string;
  active?: boolean;
  hasScale?: boolean;
  page?: number;
  limit?: number;
}

export interface DiagnosticScaleList {
  items: DiagnosticScale[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export function listDiagnosticScales(query: DiagnosticScaleListQuery = {}): Promise<DiagnosticScaleList> {
  const params = new URLSearchParams();
  if (query.search?.trim()) params.set('search', query.search.trim());
  if (query.domainId) params.set('domainId', query.domainId);
  if (query.active !== undefined) params.set('active', String(query.active));
  if (query.hasScale !== undefined) params.set('hasScale', String(query.hasScale));
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  const qs = params.toString();
  return catalogFetch<DiagnosticScaleList>(`/admin/catalog/diagnostics/scales${qs ? `?${qs}` : ''}`);
}

export function getDiagnosticScale(id: string): Promise<DiagnosticScale> {
  return catalogFetch<DiagnosticScale>(`/admin/catalog/diagnostics/${encodeURIComponent(id)}/scale`);
}

export function createPricing(data: { interventionId: string; minPrice?: number; referencePrice?: number; maxPrice?: number; travelFee?: number; serviceFee?: number; isActive?: boolean }): Promise<CatalogPricing> {
  return catalogFetch<CatalogPricing>('/admin/catalog/pricing', jsonBody(data));
}

export function updatePricing(interventionId: string, data: Record<string, unknown>): Promise<CatalogPricing> {
  return catalogFetch<CatalogPricing>(`/admin/catalog/interventions/${encodeURIComponent(interventionId)}/pricing`, patchBody(data));
}

/* Seed */
export function seedSmartphoneDomain(): Promise<{ message: string; domainId: string; problemsCount?: number }> {
  return catalogFetch<{ message: string; domainId: string; problemsCount?: number }>('/admin/catalog/seed/smartphone', { method: 'POST' });
}

/* ── Recherche de comptes clients (simulateur financier) ──────── */

export interface AdminClientUser {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
}

export interface AdminClientUserSearch {
  items: AdminClientUser[];
}

export function searchAdminClients(q: string): Promise<AdminClientUserSearch> {
  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q.trim());
  return catalogFetch<AdminClientUserSearch>(`/admin/users/clients?${params.toString()}`);
}

/* ── Supervision des missions (Sprint 8.6.5) ──────────────────── */

export interface SupervisedMissionEvent {
  id: string;
  type: string;
  label: string;
  fromStatus: string | null;
  toStatus: string | null;
  createdAt: string;
  actor: { firstName: string; lastName: string | null } | null;
}

export interface SupervisedMission {
  reference: string;
  status: string;
  category: string;
  description: string;
  contact: {
    city: string;
    neighborhood: string | null;
    address: string | null;
    landmark: string | null;
    contactPhone: string | null;
  };
  device: {
    domain: { id: string; name: string } | null;
    brand: { id: string; name: string } | null;
    model: { id: string; name: string } | null;
    problem: { id: string; name: string } | null;
  };
  client: { id: string; firstName: string; lastName: string | null; phone: string | null } | null;
  technician: {
    id: string;
    firstName: string;
    lastName: string | null;
    phone: string | null;
    city: string | null;
    kycVerified: boolean;
  } | null;
  request: {
    requestedMode: string;
    requestedAt: string | null;
    scheduledAt: string | null;
    negotiationRequestedAt: string | null;
  };
  finalAmount: number | null;
  diagnostics: {
    id: string;
    mode: string;
    content: string;
    recommendation: string | null;
    proposedIntervention: string | null;
    justification: string | null;
    notes: string | null;
    createdAt: string;
    technician: { id: string; firstName: string; lastName: string | null } | null;
    catalogDiagnostic: { id: string; name: string } | null;
    catalogIntervention: { id: string; name: string } | null;
  }[];
  quotes: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    source: string;
    description: string;
    createdAt: string;
    technician: { id: string; firstName: string; lastName: string | null } | null;
    diagnostic: {
      id: string;
      mode: string;
      content: string;
      proposedIntervention: string | null;
      justification: string | null;
      notes: string | null;
    } | null;
    catalogDiagnostic: { id: string; name: string } | null;
    catalogIntervention: { id: string; name: string } | null;
    breakdown: {
      referencePrice: number;
      travelFee: number | null;
      serviceFee: number | null;
    } | null;
  }[];
  events: SupervisedMissionEvent[];
  createdAt: string;
  updatedAt: string;
}

export function getAdminMissionByReference(reference: string): Promise<SupervisedMission> {
  return catalogFetch<SupervisedMission>(
    `/admin/demandes/reference/${encodeURIComponent(reference.trim().toUpperCase())}`,
  );
}

/* ── Référentiel géographique admin (ServiceCity / Zone) ────────
 * Contrats backend : GET/POST/PATCH /admin/catalog/cities,
 * GET /admin/catalog/cities/:cityId/zones, POST/PATCH /admin/catalog/zones.
 * Pas de suppression : une entrée se désactive via isActive. La liste des
 * villes ne fournit aucun compteur de zones (aucune requête N+1 ici : les
 * zones sont chargées uniquement pour la ville sélectionnée). */

export interface ServiceCity {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceZone {
  id: string;
  cityId: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export function listAdminCities(): Promise<ServiceCity[]> {
  return catalogFetch<ServiceCity[]>('/admin/catalog/cities');
}

export function createAdminCity(data: {
  name: string;
  slug: string;
  isActive?: boolean;
  sortOrder?: number;
}): Promise<ServiceCity> {
  return catalogFetch<ServiceCity>('/admin/catalog/cities', jsonBody(data));
}

export function updateAdminCity(id: string, data: Record<string, unknown>): Promise<ServiceCity> {
  return catalogFetch<ServiceCity>(`/admin/catalog/cities/${encodeURIComponent(id)}`, patchBody(data));
}

export function listAdminZones(cityId: string): Promise<ServiceZone[]> {
  return catalogFetch<ServiceZone[]>(`/admin/catalog/cities/${encodeURIComponent(cityId)}/zones`);
}

export function createAdminZone(data: {
  cityId: string;
  name: string;
  slug: string;
  isActive?: boolean;
  sortOrder?: number;
}): Promise<ServiceZone> {
  return catalogFetch<ServiceZone>('/admin/catalog/zones', jsonBody(data));
}

export function updateAdminZone(id: string, data: Record<string, unknown>): Promise<ServiceZone> {
  return catalogFetch<ServiceZone>(`/admin/catalog/zones/${encodeURIComponent(id)}`, patchBody(data));
}

/* ── Suppressions catalogue (Sprint ADMIN SUPER POWERS) ───────
 * Le backend supprime physiquement l'élément sans dépendance, sinon le
 * désactive (isActive = false) pour préserver l'historique. La réponse
 * précise l'action effectuée ({ action: 'DELETED' | 'DEACTIVATED' }). */

export interface CatalogDeleteOutcome {
  id: string;
  kind: string;
  action: 'DELETED' | 'DEACTIVATED';
  message: string;
  blockers: Record<string, number>;
}

export function deleteDomain(id: string): Promise<CatalogDeleteOutcome> {
  return catalogFetch<CatalogDeleteOutcome>(`/admin/catalog/domains/${encodeURIComponent(id)}`, deleteBody());
}

export function deleteBrand(id: string): Promise<CatalogDeleteOutcome> {
  return catalogFetch<CatalogDeleteOutcome>(`/admin/catalog/brands/${encodeURIComponent(id)}`, deleteBody());
}

export function deleteModel(id: string): Promise<CatalogDeleteOutcome> {
  return catalogFetch<CatalogDeleteOutcome>(`/admin/catalog/models/${encodeURIComponent(id)}`, deleteBody());
}

export function deleteProblem(id: string): Promise<CatalogDeleteOutcome> {
  return catalogFetch<CatalogDeleteOutcome>(`/admin/catalog/problems/${encodeURIComponent(id)}`, deleteBody());
}

export function deleteDiagnostic(id: string): Promise<CatalogDeleteOutcome> {
  return catalogFetch<CatalogDeleteOutcome>(`/admin/catalog/diagnostics/${encodeURIComponent(id)}`, deleteBody());
}

export function deleteIntervention(id: string): Promise<CatalogDeleteOutcome> {
  return catalogFetch<CatalogDeleteOutcome>(`/admin/catalog/interventions/${encodeURIComponent(id)}`, deleteBody());
}

export function deletePricing(interventionId: string): Promise<CatalogDeleteOutcome> {
  return catalogFetch<CatalogDeleteOutcome>(`/admin/catalog/interventions/${encodeURIComponent(interventionId)}/pricing`, deleteBody());
}

export function deleteAdminCity(id: string): Promise<CatalogDeleteOutcome> {
  return catalogFetch<CatalogDeleteOutcome>(`/admin/catalog/cities/${encodeURIComponent(id)}`, deleteBody());
}

export function deleteAdminZone(id: string): Promise<CatalogDeleteOutcome> {
  return catalogFetch<CatalogDeleteOutcome>(`/admin/catalog/zones/${encodeURIComponent(id)}`, deleteBody());
}

/* ── Gestion des comptes (Sprint ADMIN SUPER POWERS) ────────── */

export interface AdminManagedUser {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  isActive?: boolean;
}

export interface AdminUserSearch {
  items: AdminManagedUser[];
}

export interface AdminUserAccount {
  id: string;
  role: string;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  dependencies: Record<string, number>;
  deletable: boolean;
}

export interface AdminUserDeleteOutcome {
  id: string;
  role: string;
  action: 'DELETED' | 'DEACTIVATED';
  message: string;
  dependencies: Record<string, number>;
}

export function searchAdminTechnicians(q: string): Promise<AdminUserSearch> {
  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q.trim());
  return catalogFetch<AdminUserSearch>(`/admin/users/technicians?${params.toString()}`);
}

export function getAdminUserAccount(id: string): Promise<AdminUserAccount> {
  return catalogFetch<AdminUserAccount>(`/admin/users/${encodeURIComponent(id)}`);
}

export function deleteAdminUserAccount(id: string): Promise<AdminUserDeleteOutcome> {
  return catalogFetch<AdminUserDeleteOutcome>(`/admin/users/${encodeURIComponent(id)}`, deleteBody());
}

/* ── Message direct ADMIN → TECHNICIEN ──────────────────────── */

export interface AdminTechnicianMessage {
  id: string;
  technician: { id: string; firstName: string; lastName: string | null; email: string };
  createdAt: string;
}

export function sendAdminTechnicianMessage(email: string, message: string): Promise<AdminTechnicianMessage> {
  return catalogFetch<AdminTechnicianMessage>(
    '/admin/messages/technician',
    jsonBody({ email: email.trim(), message: message.trim() }),
  );
}

/* ── IA-7 — surveillance tarifaire (prépare IA-9 : liste, niveau, revue) ─ */

export interface AdminAiWarning {
  id: string;
  warningType: string;
  status: string;
  storedStatus: string;
  dueAt: string;
  justification: string | null;
  justifiedAt: string | null;
  isLateJustification: boolean;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  createdAt: string;
  quoteId: string;
  demandeId: string;
  diagnosticId: string | null;
  pricingCheckId: string;
  pricing: {
    proposedPrice: number;
    minAtCheck: number | null;
    referenceAtCheck: number | null;
    maxAtCheck: number | null;
    result: string;
    deviationAmount: number | null;
    deviationBps: number | null;
  } | null;
  surveillanceLevel?: number;
}

export interface AdminAiWarningList {
  items: AdminAiWarning[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export function listAdminAiWarnings(params?: {
  technicianId?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<AdminAiWarningList> {
  const query = new URLSearchParams();
  if (params?.technicianId) query.set('technicianId', params.technicianId);
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return catalogFetch<AdminAiWarningList>(`/admin/ai-warnings${suffix}`);
}

export function getAdminSurveillanceLevel(technicianId: string): Promise<{
  technicianId: string;
  surveillanceLevel: number;
  humanReviewRequired: boolean;
}> {
  return catalogFetch(`/admin/ai-warnings/technician/${encodeURIComponent(technicianId)}/level`);
}

export function reviewAdminAiWarning(id: string, reviewNote?: string): Promise<AdminAiWarning> {
  return catalogFetch<AdminAiWarning>(
    `/admin/ai-warnings/${encodeURIComponent(id)}/review`,
    jsonBody({ reviewNote: reviewNote?.trim() || undefined }),
  );
}

/* ── IA-9 — dashboard IA admin (visualisation + revue humaine) ─────────
 * Listes paginées côté backend (jamais de chargement intégral), revue via
 * les endpoints IA-7/IA-8 existants. Aucune analyse déclenchée d'ici. */

export interface AdminAiOverview {
  classifications: { total: number; byClassification: Record<string, number> };
  mappings: { total: number; byClassification: Record<string, number> };
  pricingChecks: { total: number; byResult: Record<string, number> };
  warnings: { total: number; pending: number; justified: number; reviewed: number; expiredEffective: number };
  conversationFlags: { total: number; open: number; reviewed: number; dismissed: number; highOpen: number };
  generatedAt: string;
}

export function getAdminAiOverview(): Promise<AdminAiOverview> {
  return catalogFetch<AdminAiOverview>('/admin/ai/overview');
}

export interface AdminAiClassification {
  id: string;
  demandeId: string;
  classification: string;
  domainId: string | null;
  domainName: string | null;
  categories: string[];
  confidence: number | null;
  model: string | null;
  promptVersion: number;
  reason: string | null;
  createdAt: string;
  demande: { id: string; reference: string; status: string; category: string } | null;
}

export interface AdminAiList<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

function aiQuery(params?: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') query.set(key, String(value));
    }
  }
  const suffix = query.toString();
  return suffix ? `?${suffix}` : '';
}

export function listAdminAiClassifications(params?: {
  classification?: string;
  domainId?: string;
  demandeId?: string;
  since?: string;
  page?: number;
  limit?: number;
}): Promise<AdminAiList<AdminAiClassification>> {
  return catalogFetch(`/admin/ai/classifications${aiQuery(params)}`);
}

export interface AdminAiMatch {
  id: string;
  diagnosticId: string;
  catalogDiagnosticId: string | null;
  catalogDiagnosticName: string | null;
  classification: string;
  confidence: number | null;
  model: string | null;
  promptVersion: number;
  reason: string | null;
  createdAt: string;
  diagnostic: { id: string; demandeId: string; content: string; createdAt: string } | null;
}

export function listAdminAiMatches(params?: {
  classification?: string;
  demandeId?: string;
  since?: string;
  page?: number;
  limit?: number;
}): Promise<AdminAiList<AdminAiMatch>> {
  return catalogFetch(`/admin/ai/matches${aiQuery(params)}`);
}

export interface AdminAiPricingCheck {
  id: string;
  quoteId: string;
  demandeId: string;
  diagnosticId: string | null;
  catalogDiagnosticId: string | null;
  proposedPrice: number;
  minAtCheck: number | null;
  referenceAtCheck: number | null;
  maxAtCheck: number | null;
  result: string;
  pricingIds: string[];
  deviationAmount: number | null;
  deviationBps: number | null;
  reason: string | null;
  createdAt: string;
  quote: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    technicianId: string;
    demande: { id: string; reference: string; status: string } | null;
  } | null;
}

export function listAdminAiPricingChecks(params?: {
  result?: string;
  demandeId?: string;
  technicianId?: string;
  since?: string;
  page?: number;
  limit?: number;
}): Promise<AdminAiList<AdminAiPricingCheck>> {
  return catalogFetch(`/admin/ai/pricing-checks${aiQuery(params)}`);
}

export interface AdminAiConversationFlag {
  id: string;
  demandeId: string;
  messageId: string;
  senderId: string;
  senderRole: string;
  category: string;
  confidence: number;
  severity: string;
  reason: string | null;
  model: string | null;
  promptVersion: number;
  status: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  createdAt: string;
  demande: { id: string; reference: string; status: string; clientId: string; technicianId: string | null } | null;
  message: { id: string; content: string; createdAt: string } | null;
  sender: { id: string; firstName: string; lastName: string | null } | null;
}

export function listAdminConversationFlags(params?: {
  status?: string;
  category?: string;
  severity?: string;
  demandeId?: string;
  senderId?: string;
  page?: number;
  limit?: number;
}): Promise<AdminAiList<AdminAiConversationFlag>> {
  return catalogFetch(`/admin/conversation-flags${aiQuery(params)}`);
}

export function reviewAdminConversationFlag(
  id: string,
  decision: 'REVIEWED' | 'DISMISSED',
  reviewNote?: string,
): Promise<AdminAiConversationFlag> {
  return catalogFetch<AdminAiConversationFlag>(
    `/admin/conversation-flags/${encodeURIComponent(id)}/review`,
    jsonBody({ decision, reviewNote: reviewNote?.trim() || undefined }),
  );
}

/* ── IA-11 — Agent IA du back-office (ADMIN uniquement, lecture seule) ──
 * Conversation en session frontend uniquement (jamais persistée) ; le
 * backend reste l'autorité (tools contrôlés, synthèse factuelle). */

export interface AiAgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiAgentChatResponse {
  reply: string;
  toolCalls: Array<{ tool: string; ok: boolean }>;
  model: string | null;
}

export interface AiAgentStatus {
  available: boolean;
  model: string | null;
  promptVersion: number;
  reason: string | null;
}

export function getAdminAiAgentStatus(): Promise<AiAgentStatus> {
  return catalogFetch<AiAgentStatus>('/admin/ai-agent/status');
}

export function postAdminAiAgentChat(message: string, history: AiAgentMessage[]): Promise<AiAgentChatResponse> {
  return catalogFetch<AiAgentChatResponse>(
    '/admin/ai-agent/chat',
    jsonBody({
      message: message.trim(),
      history: history
        .filter((item) => item && (item.role === 'user' || item.role === 'assistant'))
        .slice(-10)
        .map((item) => ({ role: item.role, content: item.content })),
    }),
  );
}

/* ── Litiges post-intervention (DISPUTE, ADMIN) ───────────────
 * Liste paginée avec filtre statut, détail avec mission + parties,
 * décision motivée (UNDER_REVIEW sans résolution, RESOLVED/REJECTED
 * avec résolution). Statuts et montants : backend seul. */

export interface AdminDispute {
  id: string;
  demandeId: string;
  category: string;
  description: string;
  status: string;
  resolution: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  demande?: { id: string; reference: string; status: string } | null;
  openedBy?: { id: string; firstName: string; lastName: string | null } | null;
  decider?: { id: string; firstName: string; lastName: string | null } | null;
}

export interface AdminDisputeList {
  items: AdminDispute[];
  page: number;
  limit: number;
  total: number;
}

export type AdminDisputeDecision = 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';

export function listAdminDisputes(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<AdminDisputeList> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return catalogFetch<AdminDisputeList>(`/admin/disputes${suffix}`);
}

export function getAdminDispute(id: string): Promise<AdminDispute> {
  return catalogFetch<AdminDispute>(`/admin/disputes/${encodeURIComponent(id)}`);
}

export function reviewAdminDispute(
  id: string,
  input: { decision: AdminDisputeDecision; resolution?: string },
): Promise<AdminDispute> {
  return catalogFetch<AdminDispute>(
    `/admin/disputes/${encodeURIComponent(id)}/review`,
    patchBody(
      input.decision === 'UNDER_REVIEW'
        ? { decision: input.decision }
        : { decision: input.decision, resolution: input.resolution?.trim() },
    ),
  );
}
