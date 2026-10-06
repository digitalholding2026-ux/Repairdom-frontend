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
/* ── Chantier FIX — mémorisation « e-mail vérifié » ───────────────────
 *
 * POURQUOI UNE CLÉ DE PLUS : la confirmation doit SURVIVRE au remontage du
 * composant. Or `refresh()` fait passer l'`AuthProvider` en `loading`, ce qui
 * fait rendre `LoadingScreen` au `RoleGuard` : le `VerificationPanel` se
 * démonte, perd son état React, puis remonte sur l'écran de confirmation
 * initial. Résultat vu en production : le spinner du bouton, puis plus rien.
 *
 * Une clé en sessionStorage permet au composant remonté de reconstituer
 * « c'est déjà vérifié » sans refaire l'appel. Elle porte le TOKEN (et non un
 * booléen nu) pour ne pas confondre deux vérifications successives dans la
 * même session.
 *
 * Ce n'est PAS un secret : c'est un indicateur d'affichage, comparable au
 * `relio-push-endpoint` déjà stocké. Le token de vérification lui-même ne vit
 * que dans l'URL. */
export const VERIFIED_TOKEN_KEY = 'relio_verified_token';

/** Marque le token comme vérifié (affichage uniquement). */
export function rememberVerifiedToken(token: string): void {
  try {
    storage()?.setItem(VERIFIED_TOKEN_KEY, token);
  } catch {
    /* stockage indisponible : la confirmation sera perdue au remontage, sans
     * conséquence fonctionnelle. */
  }
}

export function readVerifiedToken(): string | null {
  try {
    const value = storage()?.getItem(VERIFIED_TOKEN_KEY);
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function forgetVerifiedToken(): void {
  try {
    storage()?.removeItem(VERIFIED_TOKEN_KEY);
  } catch {
    /* idem */
  }
}
