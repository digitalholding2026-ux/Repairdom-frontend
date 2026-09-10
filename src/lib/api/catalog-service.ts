import { siteConfig } from '@/lib/site-config';

/* Catalogue public (client & technicien) — Sprint 8.1.
 * Strictement référentiel : ne contient AUCUN prix (le tarif n'est publié
 * qu'au moment de la sélection du diagnostic par le technicien). */

export interface CatalogDomainLite {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  category: string | null;
}

export interface CatalogBrandLite {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface CatalogModelLite {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface CatalogProblemLite {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  brandId: string | null;
  modelId: string | null;
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

export async function listCatalogDomains(): Promise<CatalogDomainLite[]> {
  return apiFetch<CatalogDomainLite[]>('/catalog/domains');
}

export async function listCatalogBrands(domainId: string): Promise<CatalogBrandLite[]> {
  return apiFetch<CatalogBrandLite[]>(`/catalog/domains/${encodeURIComponent(domainId)}/brands`);
}

export async function listCatalogModels(brandId: string): Promise<CatalogModelLite[]> {
  return apiFetch<CatalogModelLite[]>(`/catalog/brands/${encodeURIComponent(brandId)}/models`);
}

export async function listCatalogProblems(
  domainId: string,
  brandId?: string,
  modelId?: string,
): Promise<CatalogProblemLite[]> {
  const query = new URLSearchParams();
  if (brandId) query.set('brandId', brandId);
  if (modelId) query.set('modelId', modelId);
  const qs = query.toString();
  return apiFetch<CatalogProblemLite[]>(
    `/catalog/domains/${encodeURIComponent(domainId)}/problems${qs ? `?${qs}` : ''}`,
  );
}