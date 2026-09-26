import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/* Phase B — carte hero gradient unique : coque décorative partagée (halo,
 * reflet, liseré) pour les cartes solde/revenus client + technicien.
 * Règle 60-30-10 : `brand`/`primary` = Bleu Nuit structurel (#0F172A, fixe
 * clair/sombre), l'orange ne subsiste qu'en accent (chiffres, CTA) porté
 * par le contenu. `success` = disponibilité, `neutral` = état inactif. */

export type HeroTone = 'brand' | 'primary' | 'success' | 'neutral';

const TONE_CLASSES: Record<HeroTone, string> = {
  /* Bleu Nuit translucide flottant (#0F172A/85, verre dépoli) + halo
   * orange ambré adouci : fond volontairement non adaptatif, le texte
   * blanc reste lisible en mode sombre comme clair. */
  brand: 'animate-float-wave bg-[#0F172A]/85 backdrop-blur-lg',
  primary: 'animate-float-wave-delayed bg-[#0F172A]/85 backdrop-blur-lg',
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
        className="glass-halo-orange pointer-events-none absolute -right-10 -top-14 size-40 rounded-full blur-2xl"
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
      <p className="text-2xs font-medium uppercase tracking-wider text-slate-300">{label}</p>
      <p className={cn('figure text-base font-bold', muted && 'text-white/85')}>{value}</p>
    </div>
  );
}
