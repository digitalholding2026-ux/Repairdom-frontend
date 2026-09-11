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
  brand?: { id: string; name: string };
  model?: { id: string; name: string };
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

export function createPricing(data: { interventionId: string; minPrice?: number; referencePrice?: number; maxPrice?: number; travelFee?: number; serviceFee?: number }): Promise<CatalogPricing> {
  return catalogFetch<CatalogPricing>('/admin/catalog/pricing', jsonBody(data));
}

export function updatePricing(interventionId: string, data: Record<string, unknown>): Promise<CatalogPricing> {
  return catalogFetch<CatalogPricing>(`/admin/catalog/interventions/${encodeURIComponent(interventionId)}/pricing`, patchBody(data));
}

/* Seed */
export function seedSmartphoneDomain(): Promise<{ message: string; domainId: string; problemsCount?: number }> {
  return catalogFetch<{ message: string; domainId: string; problemsCount?: number }>('/admin/catalog/seed/smartphone', { method: 'POST' });
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