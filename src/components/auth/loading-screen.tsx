'use client';

import { ConnexionAnimation } from '@/components/lottie/lottie-animations';

/* Écran de chargement neutre du RoleGuard : plein écran, fond neutre,
 * animation Lottie centrée (144-176px), AUCUN texte, AUCUN bouton, AUCUN
 * lien. Si la vérification dure moins de 500ms, la transition est
 * imperceptible. `prefers-reduced-motion` : image figée via le lecteur
 * centralisé (`lottie-animation.tsx`, même pattern que les autres usages). */
export function LoadingScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <ConnexionAnimation />
    </div>
  );
}
