import { siteConfig } from '@/lib/site-config';
import { toApiError } from './api-error';

/**
 * Chantier #4A — Programme de récompenses client (API).
 *
 * Miroir EXACT de `backend/src/rewards/rewards.config.ts` (REWARD_TIERS) et
 * de `RewardsProgressView` (`backend/src/rewards/rewards.service.ts`).
 *
 * RÈGLE FCFA — rappel critique : le backend n'envoie JAMAIS un montant
 * formaté. `rewardValueXAF` est un ENTIER ; c'est `formatFCFA` qui produit
 * « 5 000 FCFA » À L'AFFICHAGE. Aucun `toLocaleString` ici, aucun suffixe
 * « FCFA » dans une chaîne : ce serait figer un montant pour tous les
 * utilisateurs et casser la rélocalisation future.
 *
 * Les endpoints sont en anglais (`/client/rewards`) comme toute l'API métier,
 * alors que la route d'écran est française (`/client/recompenses`) : c'est la
 * convention déjà en place dans le projet (voir ARCHITECTURE.md).
 */

/** Nom d'un palier. `NONE` = aucun palier atteint. */
export type RewardTierName = 'NONE' | 'BRONZE' | 'ARGENT' | 'OR' | 'PLATINE';

/** Palier réel (jamais `NONE`) : c'est ce que renvoie `tiers[]`. */
export type RewardTierKey = Exclude<RewardTierName, 'NONE'>;

/** Un palier, tel que défini par le backend. */
export interface RewardTier {
  tier: RewardTierKey;
  label: string;
  /** Missions COMPTABILISÉES requises. */
  missions: number;
  /** Libellé de la récompense, SANS montant (règle FCFA). */
  reward: string;
  /** Valeur indicative, XAF ENTIER. À afficher via `formatFCFA`. */
  rewardValueXAF: number;
}

/** Progression vers le prochain palier. */
export interface NextRewardTier {
  tier: RewardTierKey;
  missions: number;
  /** Missions restant à effectuer. Jamais négatif. */
  remaining: number;
  label: string;
  reward: string;
  rewardValueXAF: number;
}

export interface RewardProgress {
  /** Missions validées comptabilisées, cumulables à vie (aucun reset). */
  missionCount: number;
  currentTier: RewardTierName;
  reachedTiers: RewardTierName[];
  claimedTiers: RewardTierName[];
  /** Dernière mission comptabilisée, ISO. `null` si aucune. */
  lastMissionAt: string | null;
  /** `null` une fois les 4 paliers franchis. */
  nextTier: NextRewardTier | null;
  /** Catalogue des 4 paliers, dans l'ordre croissant des seuils. */
  tiers: RewardTier[];
}

export interface RewardClaimResult {
  success: true;
  tier: string;
  claimedAt: string;
  claimedTiers: RewardTierName[];
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
 * Enregistre la demande d'usage d'une récompense.
 *
 * Le 400 est renvoyé par le backend si le palier n'est pas atteint ou a déjà
 * été demandé : on laisse l'erreur remonter telle quelle pour que la page
 * affiche le message métier via `toUserErrorMessage`.
 */
export async function claimTier(tier: string): Promise<RewardClaimResult> {
  return apiFetch<RewardClaimResult>(
    `/client/rewards/${encodeURIComponent(tier.trim().toUpperCase())}/claim`,
    { method: 'POST' },
  );
}
