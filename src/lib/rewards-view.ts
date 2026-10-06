/**
 * Chantier #4A — Vue du programme de récompenses : LOGIQUE PURE.
 *
 * Module volontairement SANS React, SANS alias `@/`, SANS I/O : c'est ce qui
 * permet de le tester avec `node --test` (le runner du projet, qui n'a ni
 * jsdom ni testing-library). Les composants `RewardBadge` et
 * `/client/recompenses` ne font que RENDRE ce qui est décidé ici — donc les
 * tests couvrent le comportement réellement affiché.
 *
 * Même convention que `lib/guard-decision.ts`, `lib/technician-kyc-rules.ts`
 * ou `lib/notifications/notification-mapping.ts`.
 *
 * Les types sont déclarés LOCALEMENT (et non importés de
 * `lib/api/rewards-service.ts`) pour que ce module reste importable par le
 * runner sans résolution d'alias. Le contrat est un miroir de
 * `backend/src/rewards/rewards.config.ts`.
 */

/** Nom d'un palier. `NONE` = aucun palier atteint. */
export type RewardTierName = 'NONE' | 'BRONZE' | 'ARGENT' | 'OR' | 'PLATINE';

/** Palier réel (jamais `NONE`). */
export type RewardTierKey = Exclude<RewardTierName, 'NONE'>;

/** Forme minimale d'un palier requise par ce module. */
export interface RewardTierLike {
  tier: RewardTierKey;
  label: string;
  missions: number;
  reward: string;
  rewardValueXAF: number;
}

/* ── États d'un palier ────────────────────────────────────────────── */

export type TierStatus = 'CLAIMED' | 'REACHED' | 'IN_PROGRESS' | 'LOCKED';

/** Libellés affichés pour chaque état. */
export const TIER_STATUS_LABEL: Record<TierStatus, string> = {
  CLAIMED: 'Utilisé',
  REACHED: 'Atteint',
  IN_PROGRESS: 'En cours',
  LOCKED: 'Verrouillé',
};

/**
 * État d'un palier pour une progression donnée.
 *
 * Ordre de test DELIBÉRÉ : `CLAIMED` d'abord (une récompense demandée prime
 * sur le simple fait d'être atteinte), puis `REACHED`.
 *
 * Le seuil `missionCount >= tier.missions` est une SECONDE DÉFENSE : le
 * backend ne renvoie normalement dans `reachedTiers` que des paliers
 * réellement franchis, mais si `reachedTiers` était vide ou tronqué (donnée
 * incohérente), l'affichage ne proposerait pas « Utiliser » un palier que le
 * compteur n'a pas atteint.
 */
export function tierStatus(
  tier: RewardTierLike,
  missionCount: number,
  reachedTiers: readonly string[],
  claimedTiers: readonly string[],
): TierStatus {
  if (claimedTiers.includes(tier.tier)) return 'CLAIMED';
  if (reachedTiers.includes(tier.tier)) return 'REACHED';
  if (missionCount >= tier.missions) return 'REACHED';
  if (missionCount > 0 && tier.missions > missionCount) return 'IN_PROGRESS';
  return 'LOCKED';
}

/** Missions restant à effectuer pour un palier. Jamais négatif. */
export function missionsRemaining(tier: RewardTierLike, missionCount: number): number {
  return Math.max(tier.missions - missionCount, 0);
}

/**
 * Progression vers un palier, en pourcentage 0–100.
 * Un palier déjà dépassé est à 100 %, jamais > 100 %.
 */
export function progressPercent(missionCount: number, targetMissions: number): number {
  if (targetMissions <= 0) return 100;
  return Math.round(Math.min(Math.max(missionCount / targetMissions, 0), 1) * 100);
}

/* ── Présentation du badge de niveau ──────────────────────────────── */

/** Ce que doit afficher le badge pour un palier. */
export interface RewardBadgeView {
  emoji: string;
  label: string;
  /**
   * Classes Tailwind du palier. Uniquement des TOKENS du design system
   * (`docs/UI-UX-ARCHITECTURE.md` §8 : jamais de hex arbitraire) :
   * `warning` = ambre, `muted` = gris, `.reward-gradient` = doré (utilitaire
   * existant du thème), `info` = bleu.
   */
  className: string;
}

/** Présentation par palier. `NONE` est volontairement ABSENT. */
export const REWARD_BADGE_VIEW: Record<RewardTierKey, RewardBadgeView> = {
  BRONZE: { emoji: '🥉', label: 'Bronze', className: 'bg-warning-soft text-warning-ink' },
  ARGENT: { emoji: '🥈', label: 'Argent', className: 'bg-muted text-muted-foreground' },
  OR: {
    emoji: '🥇',
    label: 'Or',
    className: 'reward-gradient text-primary-foreground',
  },
  PLATINE: { emoji: '💎', label: 'Platine', className: 'bg-info-soft text-info-ink' },
};

/**
 * Présentation du badge, ou `null` si aucun palier n'est atteint.
 *
 * `null` (et non « Aucun niveau ») est un choix d'interface : sur un profil
 * comme dans une liste de missions, un badge vide ferait du bruit — l'absence
 * de badge EST l'information.
 */
export function rewardBadgeView(tier: RewardTierName): RewardBadgeView | null {
  if (tier === 'NONE') return null;
  return REWARD_BADGE_VIEW[tier] ?? null;
}
