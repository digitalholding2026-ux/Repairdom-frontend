'use client';

import dynamic from 'next/dynamic';
import { Icon } from '@/components/ui/icon';

const TechnicianLottie = dynamic(() => import('./technician-lottie'), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden
      className="h-44 w-56 animate-pulse rounded-3xl bg-white/5 sm:h-52 sm:w-64 lg:h-60 lg:w-72"
    />
  ),
});

export type RegisterMascotStage = 'idle' | 'filling' | 'ready';

const STAGE_MESSAGE: Record<RegisterMascotStage, string> = {
  idle: 'Mon équipement est prêt ! Remplissez vos informations pour lancer votre première demande.',
  filling: 'Plus que quelques champs… votre technicien se prépare déjà.',
  ready: 'Rien n’est laissé au hasard, votre compte est prêt !',
};

/* Panneau mascotte : animation Lottie interactive (mallette, engrenage,
 * étincelles) + message dynamique selon la complétion du formulaire
 * (idle → filling → ready). */
export function RegisterMascot({
  stage,
  percent = 0,
}: {
  stage: RegisterMascotStage;
  percent?: number;
}) {
  return (
    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl w-full">
      {/* Halos décoratifs */}
      <div aria-hidden className="pointer-events-none absolute -top-20 -left-20 size-56 rounded-full bg-[#F97316]/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-16 size-64 rounded-full bg-[#FB923C]/10 blur-3xl" />
      <div aria-hidden className="animate-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      <div className="relative">
        <TechnicianLottie className="h-44 w-56 sm:h-52 sm:w-64 lg:h-60 lg:w-72" />

        {/* Badge progression flottant */}
        <span className="animate-float absolute -right-2 top-2 hidden items-center gap-1.5 rounded-full border border-[#F97316]/40 bg-[#F97316]/20 px-3 py-1 text-xs font-semibold text-[#F97316] backdrop-blur-md sm:inline-flex">
          <Icon name="wrench" size="sm" />
          {percent}%
        </span>
      </div>

      <p aria-live="polite" className="relative mt-4 min-h-12 max-w-sm text-sm leading-relaxed text-slate-200">
        {STAGE_MESSAGE[stage]}
      </p>

      <div className="relative mt-3 hidden items-center gap-4 text-xs text-slate-400 lg:flex" aria-hidden>
        <span className="inline-flex items-center gap-1.5">
          <Icon name="shield-check" size="sm" className="text-emerald-300" />
          Compte sécurisé
        </span>
        <span className="size-1 rounded-full bg-white/20" />
        <span className="inline-flex items-center gap-1.5">
          <Icon name="zap" size="sm" className="text-amber-300" />
          Devis avant intervention
        </span>
      </div>
    </div>
  );
}

export function mascotStageForPercent(percent: number): RegisterMascotStage {
  if (percent >= 100) return 'ready';
  if (percent > 0) return 'filling';
  return 'idle';
}
