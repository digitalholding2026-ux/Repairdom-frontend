'use client';

/* Chantier #5C — bannière de bienvenue semi-guidée, premier passage.
 *
 * Elle ne se rappelle PAS tant que le technicien ne l'a pas fermée : le
 * dismissal est stocké par navigateur (`localStorage`), ce qui est un choix
 * assumé — un flag serveur sur `User` serait plus juste mais sort du périmètre
 * du chantier et exigerait une migration.
 *
 * Deux règles :
 *  1. une bannière DISMISSED ne réapparaît JAMAIS sur ce navigateur, même si
 *     l'onboarding est toujours incomplet ;
 *  2. cliquer le CTA la dismissed aussi (le technicien est déjà en route, la
 *     checklist du dashboard prend le relais).
 *
 * Le composant ne lit PAS `localStorage` : la décision appartient au parent
 * (SSR-safe), qui passe `onDismiss`/`onNavigate`. Le composant ne garde qu'un
 * état optimiste pour disparaître immédiatement au clic.
 */

import { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/cn';
import type { OnboardingTone } from './onboarding-progress-bar';

export const ONBOARDING_BANNER_STORAGE_KEY = 'relio_onboarding_banner_dismissed';

export interface OnboardingBannerProps {
  onDismiss: () => void;
  onNavigate: () => void;
  tone?: OnboardingTone;
  className?: string;
}

export function OnboardingBanner({
  onDismiss,
  onNavigate,
  tone = 'light',
  className,
}: OnboardingBannerProps) {
  /* Disparition optimiste : le parent bascule son état au même tick, mais on
   * ne veut pas laisser la bannière clignoter le temps du re-render. */
  const [hidden, setHidden] = useState(false);
  const dark = tone === 'dark';

  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    onDismiss();
  };

  return (
    <div
      role="status"
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-2xl border p-3 sm:p-4',
        dark
          ? 'border-orange-500/30 bg-orange-500/10'
          : 'border-primary/20 bg-primary/10',
        className,
      )}
    >
      <Icon
        name="sparkles"
        size="sm"
        className={cn('shrink-0', dark ? 'text-orange-400' : 'text-primary')}
      />
      <p
        className={cn(
          'min-w-0 flex-1 text-sm',
          dark ? 'text-slate-100' : 'text-foreground',
        )}
      >
        Bienvenue sur Relio ! Finalisez votre installation pour recevoir vos
        premières missions.
      </p>
      <Link
        href="/technicien/onboarding"
        onClick={() => {
          setHidden(true);
          onNavigate();
        }}
        className={cn(
          'shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          dark
            ? 'border border-orange-400/40 bg-orange-500/15 text-orange-100 hover:bg-orange-500/25'
            : 'bg-primary text-primary-foreground hover:bg-primary/90',
        )}
      >
        Terminer mon installation
        <span aria-hidden="true"> →</span>
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Masquer ce message"
        className={cn(
          'shrink-0 rounded-lg p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          dark
            ? 'text-slate-400 hover:bg-white/10 hover:text-white'
            : 'text-muted-foreground hover:bg-black/5 hover:text-foreground',
        )}
      >
        <Icon name="x" size="sm" />
      </button>
    </div>
  );
}
