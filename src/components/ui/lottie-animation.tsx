'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { Skeleton } from '@/components/ui/skeleton';

/* MISSION LottieFlow — lecteur centralisé UNIQUE (ne jamais importer
 * `lottie-react` ni les JSON ailleurs : chaque usage passe par un wrapper
 * de `src/components/lottie/` qui importe UN seul JSON → code-splitting
 * par page, jamais de chargement global).
 *
 * - `lottie-react` (v3, déjà présent) chargé en dynamique, SSR désactivé ;
 * - `prefers-reduced-motion` respecté : image figée (autoplay/loop coupés) ;
 * - décoratif par défaut (`aria-hidden`) ; passer `label` quand
 *   l'animation porte une information (texte visible obligatoire à côté) ;
 * - taille maximale imposée par l'appelant (jamais de width:100% nu). */

const Lottie = dynamic(() => import('lottie-react').then((mod) => mod.Lottie), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-2xl" />,
});

export interface LottieAnimationProps {
  animationData: unknown;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
  /** Remonte le lecteur (rejouer à chaque changement, ex. toggle menu). */
  playKey?: string | number;
  /** Texte accessible quand l'animation informe (sinon aria-hidden). */
  label?: string;
}

export function LottieAnimation({
  animationData,
  className,
  loop = true,
  autoplay = true,
  playKey,
  label,
}: LottieAnimationProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const calm = reducedMotion;

  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden', className)}
    >
      <Lottie
        key={playKey}
        src={animationData as never}
        loop={calm ? false : loop}
        autoplay={calm ? false : autoplay}
        className="h-full w-full"
      />
    </span>
  );
}
