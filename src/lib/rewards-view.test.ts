/* Programme de fidélité LTV — logique PURE (chantier 4-FONDATIONS-C).
 *
 * Exécuté avec Node 22+ natif (type stripping, zéro dépendance) :
 *   node --test src/lib/rewards-view.test.ts
 * ou : npm run test:unit
 *
 * Ce module ne fait QUE décider (statuts, pourcentages, timeline). Les
 * composants ne rendent que ça : les tests couvrent donc le comportement
 * réellement affiché, sans DOM.
 *
 * RÈGLE FCFA vérifiée ici : aucune fonction de ce module ne produit de
 * chaîne « 12 345 FCFA ». Le formatage est fait par `formatFCFA` au rendu.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BADGE_STATUS_LABEL,
  NATURE_STATUS_LABEL,
  REWARD_BADGE_VIEW,
  badgeStatus,
  buildRewardTimeline,
  canClaimCredits,
  creditProgressPercent,
  isNatureClaimable,
  marginRemaining,
  natureStatus,
  progressPercent,
  rewardBadgeView,
  type NatureTierLike,
  type RewardProgressLike,
  type RewardTierLike,
} from './rewards-view.ts';

const FIDELE: RewardTierLike = { tier: 'FIDELE', margeXAF: 10_000, label: 'Fidèle', emoji: '🥉' };
const OR: RewardTierLike = { tier: 'OR', margeXAF: 50_000, label: 'Or', emoji: '🥇' };
const PLATINE: RewardTierLike = { tier: 'PLATINE', margeXAF: 100_000, label: 'Platine', emoji: '💎' };

const PETIT: NatureTierLike = { tier: 'ELECTROMENAGER_PETIT', margeXAF: 50_000, label: 'Petit électroménager' };
const MOYEN: NatureTierLike = { tier: 'ELECTROMENAGER_MOYEN', margeXAF: 100_000, label: 'Électroménager moyen' };
const SMARTPHONE: NatureTierLike = { tier: 'SMARTPHONE', margeXAF: 250_000, label: 'Smartphone' };

function progress(overrides: Partial<RewardProgressLike> = {}): RewardProgressLike {
  return {
    cumulativeMarginXAF: 0,
    currentTier: 'NONE',
    reachedTiers: [],
    creditsEarned: 0,
    creditsClaimed: 0,
    creditsAvailable: 0,
    natureReached: [],
    natureClaimed: [],
    nextTierAt: 10_000,
    nextNatureAt: 50_000,
    trancheXAF: 10_000,
    creditPerTrancheXAF: 500,
    tiers: [FIDELE, OR, PLATINE],
    natureThresholds: [PETIT, MOYEN, SMARTPHONE],
    ...overrides,
  };
}

/* ── Badges ──────────────────────────────────────────────────────── */

void test('le programme porte sur la MARGE, plus sur un nombre de missions', () => {
  assert.equal(FIDELE.margeXAF, 10_000);
  assert.equal(OR.margeXAF, 50_000);
  assert.equal(PLATINE.margeXAF, 100_000);
  /* Les anciens paliers du #4A ont disparu. */
  assert.equal('BRONZE' in REWARD_BADGE_VIEW, false);
  assert.equal('ARGENT' in REWARD_BADGE_VIEW, false);
});

void test('badgeStatus — REACHED / IN_PROGRESS / LOCKED', () => {
  assert.equal(badgeStatus(FIDELE, 20_000, ['FIDELE']), 'REACHED');
  assert.equal(badgeStatus(OR, 20_000, ['FIDELE']), 'IN_PROGRESS');
  assert.equal(badgeStatus(OR, 0, [], []), 'LOCKED');
});

void test('badgeStatus — le seuil est une seconde défense', () => {
  // `reachedTiers` tronqué : la marge dit la vérité.
  assert.equal(badgeStatus(PLATINE, 120_000, []), 'REACHED');
  // Marge atteinte mais palier listé : cohérent.
  assert.equal(badgeStatus(FIDELE, 10_000, ['FIDELE']), 'REACHED');
  // Marge insuffisante malgré un palier listé : on ne régresse pas l'affichage.
  assert.equal(badgeStatus(FIDELE, 500, ['FIDELE']), 'REACHED');
});

void test('marginRemaining et progressPercent — jamais négatif, jamais > 100', () => {
  assert.equal(marginRemaining(FIDELE, 4_000), 6_000);
  assert.equal(marginRemaining(FIDELE, 12_000), 0);
  assert.equal(progressPercent(0, 10_000), 0);
  assert.equal(progressPercent(5_000, 10_000), 50);
  assert.equal(progressPercent(10_000, 10_000), 100);
  assert.equal(progressPercent(99_000, 10_000), 100);
});

void test('creditProgressPercent — progression dans la tranche en cours', () => {
  assert.equal(creditProgressPercent(0, 10_000), 0);
  assert.equal(creditProgressPercent(5_000, 10_000), 50);
  assert.equal(creditProgressPercent(9_999, 10_000), 100);
  /* Exactement une tranche : la tranche vient d'être complétée → 100 %
   * (la barre ne retombe pas à 0 à l'instant où le crédit est gagné). */
  assert.equal(creditProgressPercent(10_000, 10_000), 100);
  assert.equal(creditProgressPercent(11_500, 10_000), 15);
});

void test('rewardBadgeView — NONE ne rend rien, les autres ont emoji + libellé', () => {
  assert.equal(rewardBadgeView('NONE'), null);
  assert.equal(rewardBadgeView('FIDELE')?.emoji, '🥉');
  assert.equal(rewardBadgeView('FIDELE')?.label, 'Fidèle');
  assert.equal(rewardBadgeView('OR')?.label, 'Or');
  assert.equal(rewardBadgeView('PLATINE')?.emoji, '💎');
  /* Classes = tokens du design system, jamais de hex. */
  for (const view of Object.values(REWARD_BADGE_VIEW)) {
    assert.doesNotMatch(view.className, /#[0-9a-fA-F]{3,8}/);
  }
});

void test('BADGE_STATUS_LABEL couvre les 3 états', () => {
  assert.deepEqual(Object.keys(BADGE_STATUS_LABEL).sort(), ['IN_PROGRESS', 'LOCKED', 'REACHED']);
});

/* ── Crédits ─────────────────────────────────────────────────────── */

void test('canClaimCredits — strictement positif', () => {
  assert.equal(canClaimCredits(500), true);
  assert.equal(canClaimCredits(1), true);
  assert.equal(canClaimCredits(0), false);
  assert.equal(canClaimCredits(-1), false);
  assert.equal(canClaimCredits(Number.NaN), false);
});

/* ── Nature ──────────────────────────────────────────────────────── */

void test('natureStatus — CLAIMED prime sur REACHED', () => {
  assert.equal(natureStatus(PETIT, 60_000, ['ELECTROMENAGER_PETIT'], ['ELECTROMENAGER_PETIT']), 'CLAIMED');
  assert.equal(natureStatus(PETIT, 60_000, ['ELECTROMENAGER_PETIT'], []), 'REACHED');
  assert.equal(natureStatus(MOYEN, 60_000, [], []), 'IN_PROGRESS');
  assert.equal(natureStatus(MOYEN, 0, [], []), 'LOCKED');
});

void test('isNatureClaimable — seulement « atteint et non réclamé »', () => {
  assert.equal(isNatureClaimable(PETIT, 60_000, ['ELECTROMENAGER_PETIT'], []), true);
  assert.equal(isNatureClaimable(PETIT, 60_000, ['ELECTROMENAGER_PETIT'], ['ELECTROMENAGER_PETIT']), false);
  assert.equal(isNatureClaimable(PETIT, 10_000, [], []), false);
});

void test('NATURE_STATUS_LABEL — « En cours de traitement » après réclamation', () => {
  assert.equal(NATURE_STATUS_LABEL.CLAIMED, 'En cours de traitement');
  assert.equal(NATURE_STATUS_LABEL.REACHED, 'À réclamer');
});

/* ── Timeline ────────────────────────────────────────────────────── */

void test('buildRewardTimeline — vide sans palier', () => {
  assert.deepEqual(buildRewardTimeline(progress()), []);
});

void test('buildRewardTimeline — badges et nature, triés par seuil de marge', () => {
  const entries = buildRewardTimeline(
    progress({
      cumulativeMarginXAF: 110_000,
      currentTier: 'OR',
      reachedTiers: ['FIDELE', 'OR'],
      natureReached: ['ELECTROMENAGER_PETIT'],
      natureClaimed: ['ELECTROMENAGER_PETIT'],
    }),
  );
  assert.deepEqual(entries.map((e) => e.margeXAF), [10_000, 50_000, 50_000]);
  assert.deepEqual(entries.map((e) => e.kind), ['BADGE', 'BADGE', 'NATURE']);
  /* Le libellé et l'emoji viennent du catalogue, jamais d'une devinette. */
  assert.equal(entries[0].label, 'Fidèle');
  assert.equal(entries[0].emoji, '🥉');
  assert.equal(entries[2].label, 'Petit électroménager');
  /* La nature réclamée est marquée comme telle. */
  assert.equal(entries[2].claimed, true);
  assert.equal(entries[0].claimed, false);
});

void test('buildRewardTimeline — un seuil commun donne une seule ligne par événement', () => {
  /* OR (50 000) et ELECTROMENAGER_PETIT (50 000) partagent le seuil : ce sont
   * deux distinctions de même nature, affichées côte à côte et triées ensemble. */
  const entries = buildRewardTimeline(
    progress({ reachedTiers: ['OR'], natureReached: ['ELECTROMENAGER_PETIT'] }),
  );
  assert.equal(entries.length, 2);
  assert.equal(entries[0].margeXAF, entries[1].margeXAF);
});

/* ── Règle FCFA ──────────────────────────────────────────────────── */

void test('aucune fonction ne renvoie de chaîne « FCFA »', () => {
  const values = [
    ...Object.values(REWARD_BADGE_VIEW).map((v) => v.label),
    ...Object.values(BADGE_STATUS_LABEL),
    ...Object.values(NATURE_STATUS_LABEL),
  ];
  for (const value of values) {
    assert.doesNotMatch(value, /FCFA/);
  }
});