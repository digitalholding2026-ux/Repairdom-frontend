import { siteConfig } from '@/lib/site-config';
import { toApiError } from './api-error';

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

/* Familles d'équipements du parcours « Autre appareil » : indices
 * structurés (code stable) + « Je ne sais pas ». Actives seules. */
export interface EquipmentFamilyLite {
  code: string;
  label: string;
  icon: string | null;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${siteConfig.apiBaseUrl}${path}`, {
    credentials: 'include',
    ...init,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw toApiError(res, body);
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

export async function listEquipmentFamilies(): Promise<EquipmentFamilyLite[]> {
  return apiFetch<EquipmentFamilyLite[]>('/catalog/families');
}

/* Nomenclature ISO 3166-1 alpha-2 (KYC technicien).
 *
 * La liste est SERVIE par le backend et non recopiée ici : c'est la même
 * source que celle qui valide `nationality` côté serveur, donc aucune
 * divergence possible entre ce qui est proposé et ce qui est accepté. */
export interface NationalityLite {
  code: string;
  label: string;
}

export async function listNationalities(): Promise<NationalityLite[]> {
  return apiFetch<NationalityLite[]>('/catalog/nationalities');
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

/* ── Catalogue Relio v2 (M1) — prestations, catégories, items tarifés ─────
 *
 * Parcours parallèle du référentiel ci-dessus. Contrairement à celui-ci, il
 * publie bien un prix : `price` est le montant en XAF choisi par le serveur
 * (tarif public ou professionnel selon la session du visiteur). Le serveur ne
 * sert que des items ayant un montant dans la monnaie du visiteur : une
 * prestation non tarifiée est absente des listes, elle n'est pas proposée « sur
 * devis ». Le formatage « FCFA » reste uniquement à l'affichage, via
 * `formatFCFA`. */

export interface CatalogServiceLite {
  id: string;
  code: string;
  label: string;
  description: string | null;
}

export interface CatalogCategoryLite {
  id: string;
  serviceId: string;
  code: string;
  label: string;
  order: number;
}

export interface CatalogItemLite {
  id: string;
  categoryId: string;
  code: string;
  label: string;
  description: string | null;
  androidVersion: string | null;
  order: number;
  price: number | null;
  active: boolean;
  travelFee: number | null;
  paymentType: string;
  targetDevice: string;
}

export async function listServices(): Promise<CatalogServiceLite[]> {
  return apiFetch<CatalogServiceLite[]>('/services');
}

export async function listCategories(serviceCode: string): Promise<CatalogCategoryLite[]> {
  return apiFetch<CatalogCategoryLite[]>(`/services/${encodeURIComponent(serviceCode)}/categories`);
}

export async function listItems(
  serviceCode: string,
  categoryId: string,
  targetDevice?: string,
): Promise<CatalogItemLite[]> {
  const query = new URLSearchParams();
  if (targetDevice && targetDevice !== 'ALL') {
    query.set('targetDevice', targetDevice);
  }
  const qs = query.toString();
  return apiFetch<CatalogItemLite[]>(
    `/services/${encodeURIComponent(serviceCode)}/categories/${encodeURIComponent(categoryId)}/items${qs ? `?${qs}` : ''}`,
  );
}
