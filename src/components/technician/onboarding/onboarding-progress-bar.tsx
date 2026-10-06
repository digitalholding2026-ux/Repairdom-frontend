'use client';

/* Chantier #5C — barre de progression partagée entre la checklist du
 * dashboard et la page `/technicien/onboarding`.
 *
 * `tone="dark"` : le dashboard technicien est en thème SOMBRE forcé (fond
 * `relio-bg`, #0b0d12). Les jetons sémantiques (`bg-card`, `text-foreground`)
 * y rendraient une carte CLAIRE sur fond noir — c'est exactement le piège
 * déjà rencontré sur les jetons de catégories de la coquille split (#5B).
 * `tone="light"` (défaut) utilise les jetons du design system et suit la
 * préférence OS comme le reste des pages technicien.
 */

import { cn } from '@/lib/cn';

export type OnboardingTone = 'dark' | 'light';

export interface OnboardingProgressBarProps {
  completedCount: number;
  totalCount: number;
  tone?: OnboardingTone;
  /** `true` pendant le rechargement : on fige la valeur affichée. */
  loading?: boolean;
  label?: string;
  className?: string;
}

export function OnboardingProgressBar({
  completedCount,
  totalCount,
  tone = 'light',
  loading = false,
  label = 'Progression de votre installation',
  className,
}: OnboardingProgressBarProps) {
  /* `totalCount` ne peut pas être 0 : une division par zéro donnerait NaN,
   * que React rendrait comme un `width` invalide. */
  const safeTotal = totalCount > 0 ? totalCount : 1;
  const percent = Math.min(100, Math.max(0, Math.round((completedCount / safeTotal) * 100)));

  return (
    <div className={cn('space-y-1.5', className)}>
      <div
        role="progressbar"
        aria-valuenow={completedCount}
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-label={label}
        aria-busy={loading || undefined}
        className={cn(
          'h-1.5 w-full overflow-hidden rounded-full',
          tone === 'dark' ? 'bg-white/10' : 'bg-muted',
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all',
            tone === 'dark' ? 'bg-orange-500' : 'bg-primary',
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p
        className={cn(
          'text-xs',
          tone === 'dark' ? 'text-slate-400' : 'text-muted-foreground',
        )}
      >
        {completedCount} / {totalCount} étapes complétées
      </p>
    </div>
  );
}
