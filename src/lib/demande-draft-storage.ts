/* Chantier D2 — persistance du token de brouillon côté navigateur.
 *
 * Le token est un LIEN MAGIQUE : il est la seule autorisation d'accès au
 * brouillon. Il est donc stocké en `localStorage` (survit à un refresh et à une
 * fermeture d'onglet) et JAMAIS journalisé, JAMAIS mis dans une URL de
 * tracking, JAMAIS renvoyé dans un message d'erreur.
 *
 * Module volontairement SANS 'use client' ni accès direct à `window` : toutes
 * les entrées-sorties passent par des fonctions qui testent `typeof window`,
 * pour rester importables par `node --test` (aucun DOM disponible). */

export const DEMANDE_DRAFT_TOKEN_KEY = 'relio_demande_draft_token';

function storage(): Storage | null {
  /* Accès direct et non `window.localStorage` : une clé absente (navigation
   * privée stricte, iframe tierce, SSR) ne doit pas casser le wizard. */
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    /* Safari en navigation privée lève sur l'accès à `localStorage`. */
    return null;
  }
}

/** Token mémorisé, ou `null` (jamais de chaîne vide : un `''` casserait l'URL). */
export function readDemandeDraftToken(): string | null {
  try {
    const value = storage()?.getItem(DEMANDE_DRAFT_TOKEN_KEY);
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function writeDemandeDraftToken(token: string): void {
  try {
    storage()?.setItem(DEMANDE_DRAFT_TOKEN_KEY, token);
  } catch {
    /* Quota dépassé / stockage indisponible : le brouillon reste utilisable
     * pendant la session, il ne sera simplement pas restauré après refresh. */
  }
}

export function clearDemandeDraftToken(): void {
  try {
    storage()?.removeItem(DEMANDE_DRAFT_TOKEN_KEY);
  } catch {
    /* Idem : l'échec d'un nettoyage n'a aucune conséquence fonctionnelle. */
  }
}