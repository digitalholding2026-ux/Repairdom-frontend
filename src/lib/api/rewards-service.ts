import { siteConfig } from '@/lib/site-config';
import { toApiError } from './api-error';

/**
 * Chantier 4-FONDATIONS-C — Programme de fidélité LTV (API).
 *
 * Miroir EXACT de `backend/src/rewards/rewards.config.ts` et du contrat
 * `RewardProgressView` (`backend/src/rewards/rewards.service.ts`).
 *
 * RÈGLE FCFA — rappel critique : le backend n'envoie JAMAIS un montant
 * formaté. `cumulativeMarginXAF`, `creditsEarned`, `creditsAvailable`,
 * `margeXAF` sont des ENTIERS ; c'est `formatFCFA` qui produit « 10 000 FCFA »
 * À L'AFFICHAGE. Aucun `toLocaleString` ici, aucun suffixe « FCFA » dans une
 * chaîne : ce serait figer un montant pour tous les utilisateurs.
 *
 * L'unité de progression n'est plus le nombre de missions mais la MARGE
 * CUMULÉE générée par le client (le #4A est supprimé).
 *
 * Les endpoints sont en anglais (`/client/rewards`) comme toute l'API métier,
 * alors que la route d'écran est française (`/client/recompenses`) : c'est la
 * convention déjà en place dans le projet (voir ARCHITECTURE.md).
 */

/** Nom d'un palier badge. `NONE` = aucun palier atteint. */
export type RewardTierName = 'NONE' | 'FIDELE' | 'OR' | 'PLATINE';

/** Palier réel (jamais `NONE`) : c'est ce que renvoie `tiers[]`. */
export type RewardTierKey = Exclude<RewardTierName, 'NONE'>;

/** Nom d'un palier nature. */
export type NatureTierKey = 'ELECTROMENAGER_PETIT' | 'ELECTROMENAGER_MOYEN' | 'SMARTPHONE';

/** Un palier badge : franchi sur la MARGE CUMULÉE. */
export interface RewardTier {
  tier: RewardTierKey;
  /** Marge cumulée requise, XAF ENTIER. À afficher via `formatFCFA`. */
  margeXAF: number;
  label: string;
  emoji: string;
}

/** Un palier nature : récompensé en nature, cumulable. */
export interface NatureThreshold {
  tier: NatureTierKey;
  margeXAF: number;
  label: string;
}

export interface RewardProgress {
  /** Marge cumulée générée par le client, XAF ENTIER, cumulative à vie. */
  cumulativeMarginXAF: number;
  currentTier: RewardTierName;
  currentNatureTier: NatureTierKey | 'NONE';
  /** Badges atteints (tous, pas seulement le plus haut). */
  reachedTiers: RewardTierKey[];
  /** Crédits cumulés (auto, dérivés de la marge). */
  creditsEarned: number;
  /** Crédits déjà versés au solde. */
  creditsClaimed: number;
  /** Crédits encore versables — c'est ce que le bouton « ajouter au solde » verse. */
  creditsAvailable: number;
  natureReached: NatureTierKey[];
  natureClaimed: NatureTierKey[];
  lastMissionAt: string | null;
  lastCreditClaimAt: string | null;
  /** Seuil de marge du prochain crédit (touche toujours). */
  nextCreditTrancheAt: number;
  /** Marge restant à générer avant ce prochain crédit. */
  marginToNextCreditXAF: number;
  /** Seuil du prochain badge, `null` si tous atteints. */
  nextTierAt: number | null;
  /** Seuil du prochain palier nature, `null` si tous atteints. */
  nextNatureAt: number | null;
  /** Valeur d'une tranche et d'un crédit, pour l'affichage. */
  trancheXAF: number;
  creditPerTrancheXAF: number;
  tiers: RewardTier[];
  natureThresholds: NatureThreshold[];
}

export interface CreditsClaimResult {
  /** Montant versé au solde, XAF ENTIER. */
  claimedXAF: number;
  /** Nouveau solde calculé côté backend, XAF ENTIER. */
  newBalanceXAF: number;
  creditsEarned: number;
}

export interface NatureClaimResult {
  success: true;
  tier: string;
  claimedAt: string;
  natureClaimed: NatureTierKey[];
  cumulativeMarginXAF: number;
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

/** Progression complète du client connecté. */
export async function getRewardsProgress(): Promise<RewardProgress> {
  return apiFetch<RewardProgress>('/client/rewards');
}

/**
 * Verse les crédits DISPONIBLES au solde.
 *
 * Aucun montant n'est envoyé : le backend le déduit de
 * `creditsEarned - creditsClaimed`. Un client ne peut donc pas s'attribuer un
 * montant arbitraire en forgeant la requête.
 *
 * Le 400 est renvoyé par le backend s'il n'y a rien à verser : on laisse
 * l'erreur remonter pour que la page affiche le message métier.
 */
export async function claimCredits(): Promise<CreditsClaimResult> {
  return apiFetch<CreditsClaimResult>('/client/rewards/credits/claim', { method: 'POST' });
}

/**
 * Enregistre la demande de versement d'une récompense nature.
 *
 * Le versement effectif reste manuel (un conseiller / l'admin l'accorde).
 */
export async function claimNatureReward(tier: string): Promise<NatureClaimResult> {
  return apiFetch<NatureClaimResult>(
    `/client/rewards/nature/${encodeURIComponent(tier.trim().toUpperCase())}/claim`,
    { method: 'POST' },
  );
}