/* Slug technique normalisé (anti-doublons casse/espaces) — miroir exact
 * de la normalisation backend (`CatalogService.normalizeSlug`). Le nom
 * d'affichage reste intact : seule la clé technique est normalisée. */
export function autoSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}