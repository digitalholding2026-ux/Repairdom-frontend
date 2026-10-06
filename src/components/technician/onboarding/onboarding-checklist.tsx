'use client';

/* Chantier #5C — checklist de progression sur le dashboard technicien.
 *
 * Affichée UNIQUEMENT tant qu'au moins une étape n'est pas complétée : le
 * dashboard ne montre donc jamais un « 4/4 » qui n'apporterait rien. La
 * disparition est pilotée par l'appelant (`isComplete`), pas par ce composant.
 *
 * Le composant ne fait AUCUN chargement : il reçoit l'état. Cela le rend
 * réutilisable tel quel sur la page `/technicien/onboarding`.
 */

import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/icon';
import { cn } from '@/lib/cn';
import type { OnboardingState } from '@/lib/technician/use-onboarding-state';
import type { OnboardingStepId } from '@/lib/technician/onboarding-steps';
import {
  OnboardingProgressBar,
  type OnboardingTone,
} from './onboarding-progress-bar';

const STEP_ICONS: Record<OnboardingStepId, IconName> = {
  profile: 'user',
  kyc: 'shield-check',
  zones: 'pin',
  available: 'truck',
};

export interface OnboardingChecklistProps {
  state: OnboardingState;
  /** Réservé à la fermeture future ; non utilisé par le dashboard. */
  onDismiss?: () => void;
  /** `dark` sur le dashboard (thème sombre forcé), `light` sur les pages. */
  tone?: OnboardingTone;
  className?: string;
}

export function OnboardingChecklist({
  state,
  tone = 'light',
  className,
}: OnboardingChecklistProps) {
  const dark = tone === 'dark';

  return (
    <section
      aria-labelledby="onboarding-checklist-title"
      className={cn(
        'rounded-2xl border p-4',
        dark ? 'border-white/10 bg-white/5' : 'border-border bg-card',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="onboarding-checklist-title"
            className={cn(
              'text-sm font-semibold',
              dark ? 'text-white' : 'text-foreground',
            )}
          >
            Finalisez votre installation
          </h2>
          <p
            className={cn(
              'mt-0.5 text-xs',
              dark ? 'text-slate-400' : 'text-muted-foreground',
            )}
          >
            {state.next
              ? `Prochaine étape : ${state.next.title.toLowerCase()}.`
              : 'Vous êtes opérationnel.'}
          </p>
        </div>
        <Icon
          name="sparkles"
          size="sm"
          className={cn('shrink-0', dark ? 'text-orange-400' : 'text-primary')}
        />
      </div>

      <OnboardingProgressBar
        completedCount={state.completedCount}
        totalCount={state.totalCount}
        tone={tone}
        loading={state.loading}
        className="mt-3"
      />

      <ol className="mt-4 space-y-2">
        {state.steps.map((step) => (
          <li key={step.id}>
            {step.done ? (
              /* Étape terminée : PAS de lien. Un « Compléter » sur une étape
               * déjà faite est un leurre. */
              <div
                className={cn(
                  'flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm',
                  dark ? 'text-slate-400' : 'text-muted-foreground',
                )}
              >
                <Icon name="check-circle" size="sm" className="shrink-0 text-emerald-500" />
                <span className="line-through">{step.title}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 px-2.5 py-2">
                <Icon
                  name={STEP_ICONS[step.id]}
                  size="sm"
                  className={cn('shrink-0', dark ? 'text-slate-500' : 'text-muted-foreground')}
                />
                <span
                  className={cn('min-w-0 flex-1 text-sm', dark ? 'text-slate-100' : 'text-foreground')}
                >
                  {step.title}
                </span>
                <Link
                  href={step.href}
                  className={cn(
                    'shrink-0 rounded-lg px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    dark
                      ? 'border border-orange-500/40 bg-orange-500/15 text-orange-100 hover:bg-orange-500/25'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                  )}
                >
                  Compléter
                  <span className="sr-only"> : {step.title}</span>
                  <span aria-hidden="true"> →</span>
                </Link>
              </div>
            )}
          </li>
        ))}
      </ol>

      <Link
        href="/technicien/onboarding"
        className={cn(
          'mt-3 inline-flex items-center gap-1 text-xs font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          dark ? 'text-orange-300' : 'text-primary',
        )}
      >
        Voir le guide complet
        <span aria-hidden="true"> →</span>
      </Link>
    </section>
  );
}
