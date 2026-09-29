'use client';

import type { ReactNode } from 'react';
import { useViewport } from '@/lib/use-viewport';

export interface ResponsiveViewProps {
  /** Vue tactile petit écran (défaut avant montage : aucun flash). */
  mobile: ReactNode;
  /** Vue grand écran (≥ 1024 px), structure indépendante. */
  desktop: ReactNode;
  /** Affiché tant que le viewport n'est pas monté (SSR). */
  fallback?: ReactNode;
}

/* CHANTIER UI DESKTOP & MOBILE — séparation structurelle sans double
 * rendu : UNE SEULE vue est montée (jamais deux arbres DOM simultanés,
 * §29). Avant montage client, `fallback` (ou rien) évite le flash et le
 * hydration mismatch. Les media queries restent utilisées pour les
 * adaptations mineures (tailles, grilles) ; ce composant sert aux
 * divergences STRUCTURELLES (navigation, composition, ordre). */
export function ResponsiveView({ mobile, desktop, fallback = null }: ResponsiveViewProps) {
  const { mounted, isDesktop } = useViewport();
  if (!mounted) return <>{fallback}</>;
  return <>{isDesktop ? desktop : mobile}</>;
}
