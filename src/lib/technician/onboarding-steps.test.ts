/* Chantier #5C — logique d'onboarding technicien.
 *
 * Ces tests EXÉCUTENT réellement `onboarding-steps` : le module n'a que des
 * `import type` (effacés à la compilation), donc `node --test` peut
 * l'importer sans alias `@/`, sans serveur et sans DOM.
 *
 *   node --test src/lib/technician/onboarding-steps.test.ts
 * ou : npm run test:unit
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeOnboardingProgress,
  computeOnboardingSteps,
  isStepDone,
  nextOnboardingStep,
  ONBOARDING_STEP_DEFS,
  type OnboardingInput,
} from './onboarding-steps.ts';

/* ── Fabriques de test ─────────────────────────────────────────────────── */

type ProfileInput = Partial<{
  categories: string[];
  cityId: string | null;
  kycStatus: 'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  isAvailable: boolean;
}>;

function profile(overrides: ProfileInput = {}) {
  return {
    categories: [],
    cityId: null,
    kycStatus: 'NOT_SUBMITTED' as const,
    isAvailable: false,
    ...overrides,
  };
}

const ZONE = {
  zoneId: 'z-1',
  name: 'Bonapriso',
  slug: 'bonapriso',
  isActive: true,
  city: { id: 'c-1', name: 'Douala', slug: 'douala' },
};

function input(overrides: Partial<OnboardingInput> = {}): OnboardingInput {
  return { profile: profile(), coverage: [], ...overrides };
}

const allDone = (): OnboardingInput =>
  input({
    profile: profile({
      categories: ['plomberie'],
      cityId: 'c-1',
      kycStatus: 'VERIFIED',
      isAvailable: true,
    }),
    coverage: [ZONE],
  });

/* ── A.3 — cas demandés ───────────────────────────────────────────────── */

void test('#5C — aucun profil : isComplete false, completedCount 0', () => {
  const { steps, completedCount, isComplete } = computeOnboardingProgress({
    profile: null,
    coverage: null,
  });
  assert.equal(completedCount, 0);
  assert.equal(isComplete, false);
  assert.equal(steps.length, 4);
  /* Une étape ne doit JAMAIS être « terminée » sans profil : sinon un échec
   * réseau afficherait une checklist qui régresse toute seule. */
  assert.ok(steps.every((s) => !s.done));
});

void test('#5C — profil vierge : 0/4, aucune étape done', () => {
  const progress = computeOnboardingProgress(input());
  assert.equal(progress.completedCount, 0);
  assert.equal(progress.totalCount, 4);
  assert.equal(progress.isComplete, false);
  assert.ok(progress.steps.every((s) => !s.done));
});

void test('#5C — tous les critères remplis : isComplete true', () => {
  const progress = computeOnboardingProgress(allDone());
  assert.equal(progress.completedCount, 4);
  assert.equal(progress.totalCount, 4);
  assert.equal(progress.isComplete, true);
  assert.ok(progress.steps.every((s) => s.done));
  /* Plus rien à faire : aucune « prochaine » étape. */
  assert.equal(progress.next, null);
});

void test('#5C — profil seul OK : completedCount 1, et UNIQUEMENT lui', () => {
  const progress = computeOnboardingProgress(
    input({ profile: profile({ categories: ['plomberie'], cityId: 'c-1' }) }),
  );
  assert.equal(progress.completedCount, 1);
  assert.deepEqual(
    progress.steps.filter((s) => s.done).map((s) => s.id),
    ['profile'],
  );
  assert.equal(progress.steps[0]?.done, true);
  assert.equal(progress.next?.id, 'kyc');
});

void test('#5C — KYC seul OK : completedCount 1', () => {
  const progress = computeOnboardingProgress(
    input({ profile: profile({ kycStatus: 'VERIFIED' }) }),
  );
  assert.equal(progress.completedCount, 1);
  assert.deepEqual(
    progress.steps.filter((s) => s.done).map((s) => s.id),
    ['kyc'],
  );
});

void test('#5C — KYC PENDING n’est PAS terminé (en cours d’examen ≠ validé)', () => {
  for (const kycStatus of ['NOT_SUBMITTED', 'PENDING', 'REJECTED'] as const) {
    assert.equal(
      isStepDone('kyc', input({ profile: profile({ kycStatus }) })),
      false,
      `${kycStatus} ne doit pas valider l’étape KYC`,
    );
  }
  assert.equal(isStepDone('kyc', input({ profile: profile({ kycStatus: 'VERIFIED' }) })), true);
});

void test('#5C — le profil exige ET catégories ET ville de référence', () => {
  // Catégories sans ville : le dispatch n'a pas de zone à proposer.
  assert.equal(
    isStepDone('profile', input({ profile: profile({ categories: ['plomberie'] }) })),
    false,
  );
  // Ville sans catégories : aucune compétence à rattacher à une zone.
  assert.equal(
    isStepDone('profile', input({ profile: profile({ cityId: 'c-1' }) })),
    false,
  );
  // Les deux : terminé.
  assert.equal(
    isStepDone('profile', input({ profile: profile({ categories: ['plomberie'], cityId: 'c-1' }) })),
    true,
  );
});

void test('#5C — une ville texte seule ne vaut PAS ville de référence', () => {
  // `cityId` est la référence `ServiceCity` ; `city` (texte) est le repli
  // client. Confondre les deux afficherait « profil terminé » à un technicien
  // qui ne peut toujours pas définir de zones.
  assert.equal(isStepDone('profile', input({ profile: profile({ categories: ['plomberie'] }) })), false);
});

void test('#5C — zones : une seule zone couverte suffit', () => {
  assert.equal(isStepDone('zones', input({ coverage: [] })), false);
  assert.equal(isStepDone('zones', input({ coverage: [ZONE] })), true);
  // Une couverture `null` (échec réseau toléré) n’est pas « vide et donc OK ».
  assert.equal(isStepDone('zones', { profile: profile(), coverage: null }), false);
});

void test('#5C — disponibilité : seul un booléen vrai compte', () => {
  assert.equal(isStepDone('available', input({ profile: profile({ isAvailable: false }) })), false);
  assert.equal(isStepDone('available', input({ profile: profile({ isAvailable: true }) })), true);
});

/* ── Combinaisons partielles ───────────────────────────────────────────── */

void test('#5C — combinaisons partielles : chaque combinaison compte juste', () => {
  const combos: Array<[string, ProfileInput, number]> = [
    ['profil seul', { categories: ['plomberie'], cityId: 'c-1' }, 1],
    ['profil + KYC', { categories: ['plomberie'], cityId: 'c-1', kycStatus: 'VERIFIED' }, 2],
    [
      'profil + KYC + dispo',
      { categories: ['plomberie'], cityId: 'c-1', kycStatus: 'VERIFIED', isAvailable: true },
      3,
    ],
    ['KYC + dispo', { kycStatus: 'VERIFIED', isAvailable: true }, 2],
    ['zones seules', {}, 0],
  ];
  for (const [label, p, expected] of combos) {
    const progress = computeOnboardingProgress(input({ profile: profile(p) }));
    assert.equal(progress.completedCount, expected, `${label} → ${expected}`);
  }
});

void test('#5C — profil + KYC + zones + dispo = 4/4 dans l’ordre', () => {
  const progress = computeOnboardingProgress(allDone());
  assert.deepEqual(progress.steps.map((s) => s.id), ['profile', 'kyc', 'zones', 'available']);
  assert.deepEqual(progress.steps.map((s) => s.done), [true, true, true, true]);
});

void test('#5C — une étape à la fois : 4 regressions possibles couvertes', () => {
  // Régression sur CHAQUE étape : perdre l'une des 4 doit faire tomber le
  // compteur de 4 à 3. C'est le vrai risque de régression du chantier.
  const all = allDone();
  const without: Array<[string, OnboardingInput]> = [
    ['profile', { ...all, profile: profile({ cityId: 'c-1', kycStatus: 'VERIFIED', isAvailable: true }) }],
    ['kyc', { ...all, profile: profile({ categories: ['plomberie'], cityId: 'c-1', kycStatus: 'PENDING', isAvailable: true }) }],
    ['zones', { ...all, coverage: [] }],
    ['available', { ...all, profile: profile({ categories: ['plomberie'], cityId: 'c-1', kycStatus: 'VERIFIED', isAvailable: false }) }],
  ];
  for (const [id, degraded] of without) {
    const progress = computeOnboardingProgress(degraded);
    assert.equal(progress.completedCount, 3, `sans ${id} → 3/4`);
    assert.equal(progress.isComplete, false);
    assert.equal(progress.next?.id, id, `l’étape manquante redevient la suivante`);
  }
});

/* ── Contrats d'affichage (ordre, liens, numérotation) ─────────────────── */

void test('#5C — l’ordre des 4 étapes est celui validé au chantier', () => {
  assert.deepEqual(
    ONBOARDING_STEP_DEFS.map((d) => d.id),
    ['profile', 'kyc', 'zones', 'available'],
  );
  assert.deepEqual(
    computeOnboardingSteps(input()).map((s) => s.position),
    [1, 2, 3, 4],
  );
});

void test('#5C — chaque étape pointe vers la bonne page', () => {
  assert.deepEqual(
    computeOnboardingSteps(input()).map((s) => s.href),
    ['/technicien/profil', '/technicien/kyc', '/technicien/zones', '/technicien'],
  );
});

void test('#5C — chaque étape a un titre et une description (pas de trou de copiste)', () => {
  for (const step of computeOnboardingSteps(allDone())) {
    assert.ok(step.title.length > 0, `${step.id} a un titre`);
    assert.ok(step.description.length > 10, `${step.id} a une description utile`);
  }
});

void test('#5C — nextOnboardingStep renvoie la PREMIÈRE incomplète', () => {
  const steps = computeOnboardingSteps(
    input({ profile: profile({ categories: ['plomberie'], cityId: 'c-1' }) }),
  );
  // Étapes 1 OK, 2 et 3 non : c'est le KYC qui guide, pas les zones.
  assert.equal(nextOnboardingStep(steps)?.id, 'kyc');
  assert.equal(nextOnboardingStep(computeOnboardingSteps(allDone())), null);
  assert.equal(nextOnboardingStep(computeOnboardingSteps(input()))?.id, 'profile');
});
