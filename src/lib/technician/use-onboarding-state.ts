'use client';

/* Chantier #5C — état d'onboarding du technicien.
 *
 * Le hook ne fait que DU CHARGEUR : il récupère le profil et la couverture,
 * puis delegate tout le calcul à `onboarding-steps` (module pur, testé
 * directement par `node --test`). Aucune règle métier ici.
 *
 * Rafraîchissement : le technicien complète une étape sur une AUTRE page puis
 * revient sur le dashboard. Comme le dashboard peut rester monté en cache
 * (App Router, navigation client), on ne se contente pas d'un fetch au
 * montage : le hook se recharge à chaque retour sur la route et sur chaque
 * décision KYC poussée par SSE.
 */

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  getTechnicianCoverage,
  getTechnicianProfile,
  type TechnicianCoverage,
  type TechnicianProfile,
} from '@/lib/api/technician-service';
import { useUserStream } from '@/lib/realtime/use-user-stream';
import { toUserErrorMessage } from '@/lib/ui-error-message';
import {
  computeOnboardingProgress,
  type OnboardingStep,
} from './onboarding-steps';

export interface OnboardingState {
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
  /** Première étape non terminée (celle sur laquelle agir), `null` si complet. */
  next: OnboardingStep | null;
  loading: boolean;
  error: string | null;
}

const INITIAL: OnboardingState = {
  steps: [],
  completedCount: 0,
  totalCount: 4,
  isComplete: false,
  next: null,
  loading: true,
  error: null,
};

export function useOnboardingState(): OnboardingState {
  const [state, setState] = useState<OnboardingState>(INITIAL);
  const pathname = usePathname();

  const load = useCallback(async () => {
    try {
      // `profile` est nécessaire aux 3 premières étapes ; `coverage` à la
      // troisième. La couverture est tolerate au silence : un 403/404 sur
      // `/technician/coverage` ne doit pas faire échouer TOUT l'onboarding
      // alors que 3 étapes sur 4 restent calculables.
      const [profile, coverage] = await Promise.all([
        getTechnicianProfile(),
        getTechnicianCoverage().catch((): TechnicianCoverage[] => []),
      ]);
      setState({ ...toState(profile, coverage), loading: false });
    } catch (err) {
      setState({
        ...INITIAL,
        loading: false,
        error: toUserErrorMessage(err, 'Impossible de charger votre progression.'),
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, pathname]);

  /* Chantier #5A — une décision KYC prise par un admin change l'étape 2 sans
   * rechargement. Même message que le dashboard : on ne refetch que ce qui
   * concerne l'onboarding. */
  useUserStream((message) => {
    if (
      message.type === 'technician.kyc_verified' ||
      message.type === 'technician.kyc_rejected'
    ) {
      void load();
    }
  });

  return state;
}

function toState(
  profile: TechnicianProfile,
  coverage: TechnicianCoverage[],
): OnboardingState {
  const progress = computeOnboardingProgress({ profile, coverage });
  return {
    steps: progress.steps,
    completedCount: progress.completedCount,
    totalCount: progress.totalCount,
    isComplete: progress.isComplete,
    next: progress.next,
    loading: false,
    error: null,
  };
}
