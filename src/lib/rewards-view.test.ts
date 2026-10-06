/* Chantier #4A — Logique pure de la page « Mes récompenses » et du badge.
 *
 * Exécuté avec `node --test` (type stripping natif, zéro dépendance) :
 *   node --test src/lib/rewards-view.test.ts
 * ou : npm run test:unit
 *
 * Ces tests portent sur la LOGIQUE (états de palier, pourcentages,
 * présentation du badge) : c'est elle qui décide de ce qui est affiché. Le
 * composant React ne fait que rendre — et il n'y a ni jsdom ni
 * testing-library dans ce projet.
 *
 * `src/lib/rewards-view.ts` n'importe rien : ni React, ni alias `@/`, ni I/O.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  missionsRemaining,
  progressPercent,
  rewardBadgeView,
  tierStatus,
  TIER_STATUS_LABEL,
  REWARD_BADGE_VIEW,
  type RewardTierLike,
  type RewardTierKey,
} from './rewards-view.ts';

/* Miroir de `backend/src/rewards/rewards.config.ts`. */
const BRONZE: RewardTierLike = {
  tier: 'BRONZE',
  label: 'Bronze',
  missions: 15,
  reward: 'Réduction sur votre prochaine mission',
  rewardValueXAF: 5_000,
};
const ARGENT: RewardTierLike = {
  tier: 'ARGENT',
  label: 'Argent',
  missions: 50,
  reward: 'Main d’œuvre gratuite (plafond inclus)',
  rewardValueXAF: 15_000,
};
const OR: RewardTierLike = {
  tier: 'OR',
  label: 'Or',
  missions: 150,
  reward: 'Petit électroménager',
  rewardValueXAF: 25_000,
};
const PLATINE: RewardTierLike = {
  tier: 'PLATINE',
  label: 'Platine',
  missions: 500,
  reward: 'Smartphone',
  rewardValueXAF: 200_000,
};

test('tierStatus — les 4 états possibles', () => {
  /* Atteint et non encore demandé → bouton « Utiliser ma récompense ». */
  assert.equal(tierStatus(BRONZE, 20, ['BRONZE'], []), 'REACHED');
  /* Atteint ET demandé → badge « Utilisé », plus de bouton. */
  assert.equal(tierStatus(BRONZE, 20, ['BRONZE'], ['BRONZE']), 'CLAIMED');
  /* En cours de progression. */
  assert.equal(tierStatus(ARGENT, 20, ['BRONZE'], []), 'IN_PROGRESS');
  /* Verrouillé : le client n'a encore rien validé. */
  assert.equal(tierStatus(ARGENT, 0, [], []), 'LOCKED');
});

test('tierStatus — CLAIMED prime sur REACHED', () => {
  /* Un palier demandé reste « Utilisé », même si le compteur progresse. */
  assert.equal(tierStatus(BRONZE, 200, ['BRONZE', 'ARGENT'], ['BRONZE']), 'CLAIMED');
});

test('tierStatus — le seuil du compteur est une seconde défense', () => {
  /* `reachedTiers` tronqué/absent : le compteur seul ne doit pas proposer
   * « Utiliser » pour un palier non atteint. */
  assert.equal(tierStatus(PLATINE, 10, [], []), 'IN_PROGRESS');
  /* En revanche si le compteur ATTEINT le seuil, le statut est REACHED même si
   * le backend n'a rien renvoyé dans `reachedTiers`. */
  assert.equal(tierStatus(BRONZE, 15, [], []), 'REACHED');
});

test('tierStatus — 15e mission exactement : Bronze atteint', () => {
  assert.equal(tierStatus(BRONZE, 15, ['BRONZE'], []), 'REACHED');
  assert.equal(tierStatus(BRONZE, 14, [], []), 'IN_PROGRESS');
});

test('tierStatus — paliers indépendants : Bronze atteint, Argent en cours', () => {
  assert.equal(tierStatus(BRONZE, 20, ['BRONZE'], []), 'REACHED');
  assert.equal(tierStatus(ARGENT, 20, ['BRONZE'], []), 'IN_PROGRESS');
  assert.equal(tierStatus(OR, 20, ['BRONZE'], []), 'IN_PROGRESS');
  assert.equal(tierStatus(PLATINE, 20, ['BRONZE'], []), 'IN_PROGRESS');
});

test('tierStatus — programme complet : les 4 paliers atteints', () => {
  const reached = ['BRONZE', 'ARGENT', 'OR', 'PLATINE'];
  for (const tier of [BRONZE, ARGENT, OR, PLATINE]) {
    assert.equal(tierStatus(tier, 500, reached, []), 'REACHED');
  }
});

test('TIER_STATUS_LABEL — un libellé par état', () => {
  assert.deepEqual(TIER_STATUS_LABEL, {
    CLAIMED: 'Utilisé',
    REACHED: 'Atteint',
    IN_PROGRESS: 'En cours',
    LOCKED: 'Verrouillé',
  });
});

test('missionsRemaining — jamais négatif', () => {
  assert.equal(missionsRemaining(ARGENT, 20), 30);
  assert.equal(missionsRemaining(ARGENT, 50), 0);
  assert.equal(missionsRemaining(ARGENT, 500), 0);
});

test('progressPercent — borné 0–100', () => {
  assert.equal(progressPercent(0, 15), 0);
  assert.equal(progressPercent(7, 15), 47);
  assert.equal(progressPercent(15, 15), 100);
  /* Un compteur supérieur au seuil ne déborde jamais la barre. */
  assert.equal(progressPercent(500, 15), 100);
  /* Un compteur négatif ne produit pas de barre inversée. */
  assert.equal(progressPercent(-3, 15), 0);
  /* Un seuil invalide ne provoque pas de division par zéro. */
  assert.equal(progressPercent(10, 0), 100);
});

test('rewardBadgeView — NONE ne rend RIEN (null)', () => {
  /* Choix d'interface : pas de badge « aucun niveau » sur un profil ou dans
   * une liste. L'absence de badge est l'information. */
  assert.equal(rewardBadgeView('NONE'), null);
});

test('rewardBadgeView — un rendu par palier', () => {
  assert.deepEqual(rewardBadgeView('BRONZE'), {
    emoji: '🥉',
    label: 'Bronze',
    className: 'bg-warning-soft text-warning-ink',
  });
  assert.deepEqual(rewardBadgeView('ARGENT'), {
    emoji: '🥈',
    label: 'Argent',
    className: 'bg-muted text-muted-foreground',
  });
  assert.deepEqual(rewardBadgeView('OR'), {
    emoji: '🥇',
    label: 'Or',
    className: 'reward-gradient text-primary-foreground',
  });
  assert.deepEqual(rewardBadgeView('PLATINE'), {
    emoji: '💎',
    label: 'Platine',
    className: 'bg-info-soft text-info-ink',
  });
});

test('rewardBadgeView — tolère un palier inconnu (dégradation sûre)', () => {
  assert.equal(rewardBadgeView('DIAMANT' as never), null);
});

test('les 4 paliers du badge ne contiennent AUCUN hex arbitraire', () => {
  /* Règle UI/UX §8 : couleurs sémantiques du design system uniquement. */
  for (const key of Object.keys(REWARD_BADGE_VIEW) as RewardTierKey[]) {
    const { className } = REWARD_BADGE_VIEW[key];
    assert.ok(!/#[0-9a-f]{3,8}\b/i.test(className), `${key} contient un hex : ${className}`);
    assert.ok(!/(bg|text)-(slate|gray|zinc|neutral)-\d/.test(className), `${key} utilise une palette Tailwind brute`);
  }
});

test('les 4 paliers du badge utilisent 4 familles de tokens distinctes', () => {
  /* Deux paliers ne doivent pas être confondus visuellement. */
  const classes = (Object.keys(REWARD_BADGE_VIEW) as RewardTierKey[]).map(
    (key) => REWARD_BADGE_VIEW[key].className,
  );
  assert.equal(new Set(classes).size, 4);
});

test('les paliers du badge couvrent exactement BRONZE/ARGENT/OR/PLATINE', () => {
  assert.deepEqual(Object.keys(REWARD_BADGE_VIEW), ['BRONZE', 'ARGENT', 'OR', 'PLATINE']);
});

test('RÈGLE FCFA — les libellés de récompense ne contiennent aucun montant', () => {
  /* Le montant est un ENTIER séparé (`rewardValueXAF`) et sera affiché par
   * `formatFCFA`. Un montant dans le libellé serait figé. */
  for (const tier of [BRONZE, ARGENT, OR, PLATINE]) {
    assert.ok(!tier.reward.includes('FCFA'), tier.reward);
    assert.ok(!/\d/.test(tier.reward), tier.reward);
    assert.equal(Number.isInteger(tier.rewardValueXAF), true);
  }
});

test('les seuils des paliers sont 15 / 50 / 150 / 500', () => {
  assert.deepEqual(
    [BRONZE, ARGENT, OR, PLATINE].map((tier) => tier.missions),
    [15, 50, 150, 500],
  );
});
