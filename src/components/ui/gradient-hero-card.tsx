import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/* Phase B — carte hero gradient unique : coque décorative partagée (halo,
 * reflet, liseré) pour les cartes solde/revenus client + technicien.
 * `tone` distingue les dégradés en usage (`brand` client, `primary`
 * technicien, `success` disponibilité, `neutral` état inactif fixe).
 * Le contenu (titre, montant, stats, pied) reste en `children`
 * pour ne pas figer les variantes métier. */

export type HeroTone = 'brand' | 'primary' | 'success' | 'neutral';

const TONE_CLASSES: Record<HeroTone, string> = {
  brand: 'from-brand-gradient-from via-brand-gradient-via to-brand-gradient-to',
  primary: 'from-primary via-brand-gradient-via to-brand-gradient-to',
  success: 'success-gradient',
  /* Fixe (ardoise sombre) : fond volontairement non adaptatif, le texte
   * blanc doit rester lisible en mode sombre comme en mode clair. */
  neutral: 'from-zinc-600 via-slate-600 to-slate-700',
};

export interface GradientHeroCardProps {
  tone?: HeroTone;
  className?: string;
  children: ReactNode;
}

export function GradientHeroCard({ tone = 'brand', className, children }: GradientHeroCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white shadow-pop',
        TONE_CLASSES[tone],
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-14 size-40 rounded-full bg-white/15 blur-2xl"
      />
      <div
        aria-hidden
        className="animate-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/30"
      />
      {children}
    </div>
  );
}

/* Cellule statistique d'une carte hero (label + montant, police display tabulaire). */
export function HeroStat({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/15 px-3 py-2 backdrop-blur-sm">
      <p className="text-2xs font-medium uppercase tracking-wider text-white/85">{label}</p>
      <p className={cn('figure text-base font-bold', muted && 'text-white/85')}>{value}</p>
    </div>
  );
}
