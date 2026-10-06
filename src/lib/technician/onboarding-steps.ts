/* Chantier #5C — étapes d'onboarding technicien.
 *
 * Ce module est PUR : aucune dépendance React, aucun `fetch`, aucun import
 * runtime. Il ne contient que des TYPES (`import type`, effacé à la
 * compilation) et des fonctions de calcul, ce qui permet à `node --test`
 * d'importer et d'EXÉCUTER les tests sur la logique réelle — sans serveur,
 * sans DOM, sans bibliothèque de rendu.
 *
 * Le hook `useOnboardingState` (`./use-onboarding-state`) ne fait qu'aller
 * chercher le profil et la couverture, puis delegate le calcul ici.
 */

import type { TechnicianCoverage, TechnicianProfile } from '@/lib/api/technician-service';

export type OnboardingStepId = 'profile' | 'kyc' | 'zones' | 'available';

export interface OnboardingStep {
  id: OnboardingStepId;
  /** Rang affiché (1 à 4) : l'ordre des étapes est un guidage, pas un tri. */
  position: number;
  title: string;
  description: string;
  done: boolean;
  href: string;
}

export interface OnboardingInput {
  profile: Pick<
    TechnicianProfile,
    'categories' | 'cityId' | 'kycStatus' | 'isAvailable'
  > | null;
  coverage: TechnicianCoverage[] | null;
}

/* Ordre VALIDÉ du chantier : profil → identité → zones → disponibilité.
 * C'est l'ordre de dépendance réel (sans ville on ne peut pas définir de
 * zones ; sans identité vérifiée ni zones, la disponibilité ne sert à rien). */
export const ONBOARDING_STEP_DEFS: ReadonlyArray<{
  id: OnboardingStepId;
  title: string;
  description: string;
  href: string;
}> = [
  {
    id: 'profile',
    title: 'Compléter mon profil',
    description:
      'Ajoutez vos catégories de réparation et votre ville d’intervention pour apparaître dans les bonnes recherches.',
    href: '/technicien/profil',
  },
  {
    id: 'kyc',
    title: 'Vérifier mon identité',
    description:
      'La vérification d’identité rassure les clients. Elle est obligatoire avant de recevoir vos premières missions.',
    href: '/technicien/kyc',
  },
  {
    id: 'zones',
    title: 'Définir mes zones',
    description:
      'Choisissez les zones que vous couvrez dans votre ville pour recevoir les missions qui vous correspondent.',
    href: '/technicien/zones',
  },
  {
    id: 'available',
    title: 'Me rendre disponible',
    description:
      'Activez votre disponibilité pour être proposé sur les missions de vos zones.',
    href: '/technicien',
  },
];

/**
 * Une étape est `done` si son critère métier est satisfait.
 *
 * - profil     : au moins une catégorie ET une ville de RÉFÉRENCE. La ville
 *                seule ne suffit pas (sans compétence, le dispatch n'a rien à
 *                proposer) et les catégories seules non plus (sans ville, les
 *                zones ne peuvent pas être proposées).
 * - kyc        : `VERIFIED` strict. `PENDING` n'est PAS terminé : le dossier
 *                est encore en examen côté admin.
 * - zones      : au moins une zone couverte.
 * - available  : `isAvailable === true`.
 */
export function isStepDone(
  id: OnboardingStepId,
  input: OnboardingInput,
): boolean {
  const { profile, coverage } = input;

  // Sans profil, aucune étape ne peut être terminée : on ne veut jamais
  // afficher « terminé » sur un chargement partiel (échec réseau, refresh).
  if (!profile) return false;

  switch (id) {
    case 'profile':
      return (profile.categories?.length ?? 0) > 0 && profile.cityId != null;
    case 'kyc':
      return profile.kycStatus === 'VERIFIED';
    case 'zones':
      return (coverage?.length ?? 0) > 0;
    case 'available':
      return profile.isAvailable === true;
  }
}

/** Les 4 étapes, dans l'ordre du chantier, avec leur statut calculé. */
export function computeOnboardingSteps(input: OnboardingInput): OnboardingStep[] {
  return ONBOARDING_STEP_DEFS.map((def, index) => ({
    id: def.id,
    position: index + 1,
    title: def.title,
    description: def.description,
    done: isStepDone(def.id, input),
    href: def.href,
  }));
}

/** Première étape non terminée — celle sur laquelle le technicien doit agir. */
export function nextOnboardingStep(steps: OnboardingStep[]): OnboardingStep | null {
  return steps.find((step) => !step.done) ?? null;
}

export interface OnboardingProgress {
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
  next: OnboardingStep | null;
}

export function computeOnboardingProgress(input: OnboardingInput): OnboardingProgress {
  const steps = computeOnboardingSteps(input);
  const completedCount = steps.filter((step) => step.done).length;
  const totalCount = steps.length;
  return {
    steps,
    completedCount,
    totalCount,
    isComplete: completedCount === totalCount,
    next: nextOnboardingStep(steps),
  };
}
