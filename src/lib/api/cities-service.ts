import { siteConfig } from '@/lib/site-config';

export interface CityZone {
  id: string;
  name: string;
}

export interface City {
  id: string;
  name: string;
  /* Zones actives de la ville (fournies par GET /cities). Absent des
   * anciennes réponses : toujours lire via `city.zones ?? []`. */
  zones?: CityZone[];
}

/** Liste publique des villes de service (require ?? require no auth). */
export async function listCities(): Promise<City[]> {
  const res = await fetch(`${siteConfig.apiBaseUrl}/cities`, { credentials: 'include' });
  if (!res.ok) throw new Error('Erreur chargement des villes.');
  const body = await res.json().catch(() => null);
  // L'endpoint renvoie un tableau.
  return Array.isArray(body) ? body : ((body as { items?: City[] })?.items ?? []);
}