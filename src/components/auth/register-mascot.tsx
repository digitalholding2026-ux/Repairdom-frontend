'use client';

import { Icon } from '@/components/ui/icon';

export type RegisterMascotStage = 'idle' | 'filling' | 'ready';

const STAGE_MESSAGE: Record<RegisterMascotStage, string> = {
  idle: 'Mon équipement est prêt ! Remplissez vos informations pour lancer votre première demande.',
  filling: 'Plus que quelques champs… votre technicien se prépare déjà.',
  ready: 'Rien n’est laissé au hasard, votre compte est prêt !',
};

/* Mascotte animée 100 % locale (SVG + CSS, aucune dépendance réseau) :
 * technicien avec casque, mallette d'outils, engrenage rotatif et
 * étincelles flottantes. Le message évolue avec la complétion du
 * formulaire (idle → filling → ready). */
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
        <svg
          viewBox="0 0 320 240"
          role="img"
          aria-label="Mascotte technicien Relio avec sa mallette d'outils"
          className="h-44 w-auto sm:h-52 lg:h-60"
        >
          <defs>
            <radialGradient id="rm-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F97316" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="rm-body" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
          </defs>

          <ellipse cx="160" cy="128" rx="130" ry="100" fill="url(#rm-glow)" />

          {/* Engrenage rotatif */}
          <g
            style={{
              transformBox: 'fill-box',
              transformOrigin: 'center',
              animation: 'rm-spin 10s linear infinite',
            }}
          >
            <g transform="translate(232,72)">
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                <rect
                  key={deg}
                  x="-7"
                  y="-44"
                  width="14"
                  height="20"
                  rx="4"
                  fill="#F97316"
                  opacity="0.9"
                  transform={`rotate(${deg})`}
                />
              ))}
              <circle r="34" fill="#F97316" />
              <circle r="14" fill="#0B0D12" />
            </g>
          </g>

          {/* Mallette d'outils */}
          <g className="animate-float">
            <rect x="52" y="150" width="128" height="62" rx="12" fill="url(#rm-body)" />
            <rect x="52" y="150" width="128" height="20" rx="10" fill="#0B0D12" opacity="0.25" />
            <rect x="96" y="138" width="40" height="16" rx="8" fill="none" stroke="#F8FAFC" strokeWidth="7" />
            <rect x="106" y="172" width="20" height="14" rx="3" fill="#0B0D12" opacity="0.55" />
            <rect x="62" y="158" width="34" height="6" rx="3" fill="#fff" opacity="0.35" />
            {/* Clé qui dépasse */}
            <g transform="rotate(-24 180 150)">
              <rect x="174" y="112" width="10" height="42" rx="5" fill="#E2E8F0" />
              <circle cx="179" cy="106" r="11" fill="none" stroke="#E2E8F0" strokeWidth="8" />
            </g>
          </g>

          {/* Technicien */}
          <g>
            <rect x="196" y="150" width="72" height="62" rx="16" fill="#1F2937" />
            <rect x="210" y="150" width="12" height="62" fill="#F97316" opacity="0.85" />
            <rect x="242" y="150" width="12" height="62" fill="#F97316" opacity="0.85" />
            <circle cx="232" cy="122" r="26" fill="#FCD9B8" />
            {/* Casque */}
            <path d="M206 118 a26 26 0 0 1 52 0 z" fill="#F97316" />
            <rect x="200" y="114" width="64" height="9" rx="4.5" fill="#EA580C" />
            <rect x="228" y="86" width="8" height="12" rx="4" fill="#EA580C" />
            {/* Visage */}
            <circle cx="223" cy="124" r="3" fill="#0B0D12" />
            <circle cx="241" cy="124" r="3" fill="#0B0D12" />
            <path d="M224 136 q8 7 16 0" stroke="#0B0D12" strokeWidth="3" fill="none" strokeLinecap="round" />
            <circle cx="216" cy="132" r="4" fill="#F97316" opacity="0.4" />
            <circle cx="248" cy="132" r="4" fill="#F97316" opacity="0.4" />
          </g>

          {/* Étincelles flottantes */}
          <g fill="#FBBF24">
            <circle cx="70" cy="90" r="5" className="animate-float" />
            <circle cx="110" cy="60" r="3.5" className="animate-float" style={{ animationDelay: '-1.2s' }} />
            <circle cx="272" cy="150" r="4" className="animate-float" style={{ animationDelay: '-2s' }} />
          </g>
          <g stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.9">
            <path d="M92 110 h12 M98 104 v12" className="animate-float" style={{ animationDelay: '-0.6s' }} />
            <path d="M256 108 h10 M261 103 v10" className="animate-float" style={{ animationDelay: '-1.8s' }} />
          </g>
        </svg>

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

      <style>{`@keyframes rm-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function mascotStageForPercent(percent: number): RegisterMascotStage {
  if (percent >= 100) return 'ready';
  if (percent > 0) return 'filling';
  return 'idle';
}
