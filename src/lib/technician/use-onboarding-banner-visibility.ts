'use client';

/* Chantier #5C — visibilité de la bannière d'onboarding (dismiss par
 * navigateur).
 *
 * `localStorage` n'existe pas pendant le rendu serveur : le lire directement
 * dans le composant créerait un écart hydratation (la bannière apparaîtrait
 * côté serveur puis disparaîtrait). On lit donc au MONTAGE et on expose
 * `ready` : tant qu'il est `false`, l'appelant n'affiche rien. Coût : la
 * bannière apparaît une frame plus tard, invisible pour l'utilisateur.
 *
 * Le dismissal est PAR NAVIGATEUR et non par compte (choix assumé, cf.
 * `onboarding-banner`). Une fois dismissed, la bannière ne réapparaît plus,
 * même si l'onboarding reste incomplet : la checklist, elle, reste visible.
 */

import { useCallback, useEffect, useState } from 'react';
import { ONBOARDING_BANNER_STORAGE_KEY } from '@/components/technician/onboarding/onboarding-banner';

export interface OnboardingBannerVisibility {
  /** `false` tant que le montage n'a pas eu lieu : ne rien afficher. */
  ready: boolean;
  dismissed: boolean;
  dismiss: () => void;
}

export function useOnboardingBannerVisibility(): OnboardingBannerVisibility {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let value: string | null = null;
    try {
      value = window.localStorage.getItem(ONBOARDING_BANNER_STORAGE_KEY);
    } catch {
      // Navigation privée / stockage bloqué : on traite comme « jamais
      // dismissed ». La bannière réapparaîtra, ce qui est le défaut tolerable.
    }
    setDismissed(value === 'true');
    setReady(true);
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      window.localStorage.setItem(ONBOARDING_BANNER_STORAGE_KEY, 'true');
    } catch {
      // Idem : l'état React suffit pour la session en cours.
    }
  }, []);

  return { ready, dismissed, dismiss };
}
