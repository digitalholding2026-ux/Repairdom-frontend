'use client';

import { useEffect, useState } from 'react';

/* CHANTIER UI DESKTOP & MOBILE — détection viewport CENTRALISÉE.
 *
 * Un seul `matchMedia` par breakpoint (jamais de `window.innerWidth`
 * dispersé, jamais de dizaines de `useEffect` indépendants). SSR-safe :
 * `mounted` reste faux au premier rendu serveur → aucun hydration
 * mismatch, aucun flash (l'appelant affiche un fallback neutre tant que
 * `mounted` est faux, ex. via `ResponsiveView`).
 * Breakpoint unique `lg` (1024 px), aligné sur les utilitaires Tailwind
 * (`lg:hidden`, sidebar `hidden lg:block`). */

export const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';

export interface ViewportState {
  /** Vrai après montage client uniquement (garde anti-mismatch). */
  mounted: boolean;
  /** Vrai sur écran large (≥ 1024 px), faux sinon (mobile + tablette). */
  isDesktop: boolean;
  /** Inverse de `isDesktop` (monté ou non). */
  isMobile: boolean;
}

export function useViewport(query: string = DESKTOP_MEDIA_QUERY): ViewportState {
  const [mounted, setMounted] = useState(false);
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const list = window.matchMedia(query);
    setMatches(list.matches);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    if (typeof list.addEventListener === 'function') {
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    }
    // Repli navigateurs anciens (`addListener` déprécié).
    list.addListener(onChange);
    return () => list.removeListener(onChange);
  }, [query]);

  return { mounted, isDesktop: mounted && matches, isMobile: !mounted || !matches };
}

/** Raccourci : `true` sur desktop (≥ 1024 px) après montage, `false` sinon. */
export function useIsDesktop(): boolean {
  return useViewport().isDesktop;
}
