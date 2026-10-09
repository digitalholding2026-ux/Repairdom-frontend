import { toApiError, type ApiError } from '@/lib/api/api-error';

/* Barème, format de code et libellés vivent dans `../referrals-rules.ts`,
 * module PUR exécutable sous `node --test`. Ils sont ré-exportés ici pour que
 * les appelants n'aient qu'un point d'entrée.
 *
 * Le compte est TOUJOURS déduit du JWT côté backend : aucun `userId` n'est
 * accepté ici. Les deux endpoints sont scopés CLIENT par le contrôleur.
 */
export * from '@/lib/referrals-rules';
import type { MyReferrals } from '@/lib/referrals-rules';

/**
 * Chantier 4B — API du programme de parrainage.
 *
 * Règle FCFA : ce service ne transporte que des ENTIERS XAF. Le formatage
 * FCFA est fait à l'affichage par `formatFCFA`.
 */

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiError;
    throw toApiError(response, body);
  }
  return (await response.json()) as T;
}

/** Code, lien de partage, progression et liste des filleuls. */
export async function getMyReferrals(): Promise<MyReferrals> {
  return apiFetch<MyReferrals>('/client/referrals/me');
}

/**
 * Code personnel, créé au besoin.
 *
 * Le backend le génère déjà lors de `GET /client/referrals/me` ; cet endpoint
 * reste utile pour obtenir le code sans charger la liste complète.
 */
export async function getOrCreateMyCode(): Promise<{ code: string }> {
  return apiFetch<{ code: string }>('/client/referrals/code', { method: 'POST' });
}