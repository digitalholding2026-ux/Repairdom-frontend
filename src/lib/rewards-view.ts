/**
 * Chantier 4-FONDATIONS-C — Programme de fidélité LTV : LOGIQUE PURE.
 *
 * Module volontairement SANS React, SANS alias `@/`, SANS E/S : c'est ce qui
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
 *
 * RÈGLE FCFA : ce module ne produit JAMAIS de chaîne « 12 345 FCFA ». Il
 * calcule des pourcentages, des statuts et des restes ; le formatage est fait
 * par `formatFCFA` au moment du rendu.
 */

/** Nom d'un palier badge. `NONE` = aucun palier atteint. */
export type RewardTierName = 'NONE' | 'FIDELE' | 'OR' | 'PLATINE';

/** Palier réel (jamais `NONE`). */
export type RewardTierKey = Exclude<RewardTierName, 'NONE'>;

/** Nom d'un palier nature. */
export type NatureTierKey = 'ELECTROMENAGER_PETIT' | 'ELECTROMENAGER_MOYEN' | 'SMARTPHONE';

/** Forme minimale d'un palier badge requise par ce module. */
export interface RewardTierLike {
  tier: RewardTierKey;
  margeXAF: number;
  label: string;
  emoji: string;
}

/** Forme minimale d'un palier nature requise par ce module. */
export interface NatureTierLike {
  tier: NatureTierKey;
  margeXAF: number;
  label: string;
}

/** Forme minimale de la progression requise par ce module. */
export interface RewardProgressLike {
  cumulativeMarginXAF: number;
  currentTier: RewardTierName;
  reachedTiers: readonly RewardTierKey[];
  creditsEarned: number;
  creditsClaimed: number;
  creditsAvailable: number;
  natureReached: readonly NatureTierKey[];
  natureClaimed: readonly NatureTierKey[];
  nextTierAt: number | null;
  nextNatureAt: number | null;
  trancheXAF: number;
  creditPerTrancheXAF: number;
  /** Catalogue des badges, pour les libellés et les seuils de la timeline. */
  tiers: readonly RewardTierLike[];
  /** Catalogue des récompenses nature, idem. */
  natureThresholds: readonly NatureTierLike[];
}

/* ── Badges ───────────────────────────────────────────────────────── */

/** État d'un palier badge pour une progression donnée. */
export type BadgeStatus = 'REACHED' | 'IN_PROGRESS' | 'LOCKED';

export const BADGE_STATUS_LABEL: Record<BadgeStatus, string> = {
  REACHED: 'Atteint',
  IN_PROGRESS: 'En cours',
  LOCKED: 'Verrouillé',
};

/**
 * État d'un palier badge.
 *
 * Le seuil `cumulativeMarginXAF >= tier.margeXAF` est une SECONDE DÉFENSE :
 * le backend ne renvoie normalement dans `reachedTiers` que des paliers
 * réellement franchis, mais si la liste était tronquée, l'UI ne proposerait
 * pas « atteint » un palier que la marge n'a pas franchi.
 */
export function badgeStatus(
  tier: RewardTierLike,
  cumulativeMarginXAF: number,
  reachedTiers: readonly string[],
): BadgeStatus {
  if (reachedTiers.includes(tier.tier)) return 'REACHED';
  if (cumulativeMarginXAF >= tier.margeXAF) return 'REACHED';
  if (cumulativeMarginXAF > 0) return 'IN_PROGRESS';
  return 'LOCKED';
}

/** Marge restant à générer pour un palier (badge OU nature). Jamais négatif. */
export function marginRemaining(
  tier: { margeXAF: number },
  cumulativeMarginXAF: number,
): number {
  return Math.max(tier.margeXAF - cumulativeMarginXAF, 0);
}

/**
 * Progression vers un palier, en pourcentage 0–100.
 * Un palier déjà dépassé est à 100 %, jamais > 100 %.
 */
export function progressPercent(cumulativeMarginXAF: number, targetMarginXAF: number): number {
  if (targetMarginXAF <= 0) return 100;
  return Math.round(Math.min(Math.max(cumulativeMarginXAF / targetMarginXAF, 0), 1) * 100);
}

/**
 * Progression dans la TRANCHE DE CRÉDIT en cours, en pourcentage 0–100.
 *
 * Sémantique retenue : la barre suit la tranche que le client est en train
 * d'accumuler. À un multiple exact de `trancheXAF`, la tranche vient d'être
 * complétée → 100 % (et non 0 %), pour ne pas faire tomber la barre à zéro
 * à l'instant précis où un crédit est gagné.
 */
export function creditProgressPercent(cumulativeMarginXAF: number, trancheXAF: number): number {
  if (trancheXAF <= 0) return 100;
  const inTranche = cumulativeMarginXAF % trancheXAF;
  if (cumulativeMarginXAF > 0 && inTranche === 0) return 100;
  return Math.round(Math.min(Math.max(inTranche / trancheXAF, 0), 1) * 100);
}

/* ── Récompenses nature ───────────────────────────────────────────── */

/**
 * État d'un palier nature.
 *
 * `CLAIMED` passe AVANT `REACHED` : une récompense réclamée est en cours de
 * traitement, elle ne doit plus être présentée comme à réclamer.
 */
export type NatureStatus = 'CLAIMED' | 'REACHED' | 'IN_PROGRESS' | 'LOCKED';

export const NATURE_STATUS_LABEL: Record<NatureStatus, string> = {
  CLAIMED: 'En cours de traitement',
  REACHED: 'À réclamer',
  IN_PROGRESS: 'En cours',
  LOCKED: 'Verrouillé',
};

export function natureStatus(
  tier: NatureTierLike,
  cumulativeMarginXAF: number,
  reached: readonly string[],
  claimed: readonly string[],
): NatureStatus {
  if (claimed.includes(tier.tier)) return 'CLAIMED';
  if (reached.includes(tier.tier)) return 'REACHED';
  if (cumulativeMarginXAF >= tier.margeXAF) return 'REACHED';
  if (cumulativeMarginXAF > 0) return 'IN_PROGRESS';
  return 'LOCKED';
}

/** Un palier nature est-il réclamable maintenant ? */
export function isNatureClaimable(
  tier: NatureTierLike,
  cumulativeMarginXAF: number,
  reached: readonly string[],
  claimed: readonly string[],
): boolean {
  return natureStatus(tier, cumulativeMarginXAF, reached, claimed) === 'REACHED';
}

/* ── Crédits ──────────────────────────────────────────────────────── */

/**
 * Les crédits sont-ils versables ?
 *
 * Le montant vient TOUJOURS du backend (`creditsAvailable`) : ce module ne
 * le recalcule pas, il ne fait que tester la positivité. Un état à zéro ou
 * négatif doit.disable le bouton.
 */
export function canClaimCredits(creditsAvailable: number): boolean {
  return Number.isFinite(creditsAvailable) && creditsAvailable > 0;
}

/* ── Présentation du badge ────────────────────────────────────────── */

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
  FIDELE: { emoji: '🥉', label: 'Fidèle', className: 'bg-warning-soft text-warning-ink' },
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

/* ── Timeline ─────────────────────────────────────────────────────── */

/** Une étape de l'historique des paliers atteints. */
export interface RewardTimelineEntry {
  kind: 'BADGE' | 'NATURE';
  key: string;
  label: string;
  emoji: string | null;
  /** Seuil de marge franchi, XAF ENTIER (jamais formaté ici). */
  margeXAF: number;
  /** `true` si la récompense a déjà été réclamée (traitement en cours). */
  claimed: boolean;
}

/**
 * Historique des paliers atteints, dans l'ordre CRUCIAL de la marge.
 *
 * Badge et nature suivent la MÊME marge cumulée : à seuil égal, c'est UN seul
 * événement vécu par le client, donc une seule ligne. Les seuils sont lus dans
 * les catalogues `tiers` / `natureThresholds` (jamais devinés) ; un palier
 * atteint mais absent du catalogue — donnée incohérente — reste affiché, avec
 * un seuil à 0 plutôt que d'être silencieusement masqué.
 */
export function buildRewardTimeline(progress: RewardProgressLike): RewardTimelineEntry[] {
  const entries: RewardTimelineEntry[] = [];

  for (const name of progress.reachedTiers) {
    const tier = progress.tiers.find((t) => t.tier === name);
    entries.push({
      kind: 'BADGE',
      key: `badge-${name}`,
      label: tier?.label ?? REWARD_BADGE_VIEW[name]?.label ?? name,
      emoji: tier?.emoji ?? REWARD_BADGE_VIEW[name]?.emoji ?? null,
      margeXAF: tier?.margeXAF ?? 0,
      claimed: false,
    });
  }

  for (const name of progress.natureReached) {
    const tier = progress.natureThresholds.find((t) => t.tier === name);
    entries.push({
      kind: 'NATURE',
      key: `nature-${name}`,
      label: tier?.label ?? name,
      emoji: null,
      margeXAF: tier?.margeXAF ?? 0,
      claimed: progress.natureClaimed.includes(name),
    });
  }

  return entries.sort((a, b) => a.margeXAF - b.margeXAF || a.key.localeCompare(b.key));
}
