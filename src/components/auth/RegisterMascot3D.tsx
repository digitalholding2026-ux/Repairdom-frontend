'use client';

import dynamic from 'next/dynamic';

const TechnicianLottie = dynamic(() => import('./technician-lottie'), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden
      className="h-56 w-full max-w-[280px] animate-pulse rounded-3xl bg-white/5"
    />
  ),
});

export interface RegisterMascotIdentity {
  firstName: string;
  lastName: string;
}

/* Panneau gauche de l'inscription : player Lottie (mallette, engrenages,
 * étincelles — asset local, aucun CDN), badge de progression, carte
 * d'aperçu client en direct et message d'encouragement. Même hauteur que
 * le formulaire via `lg:items-stretch` + `h-full`.
 *
 * Choix player : `lottie-react` (déjà installé, maintenu, compatible
 * React 19, SSR neutralisé) plutôt que `@lottiefiles/react-lottie-player`
 * (legacy). L'asset LottieFiles suggéré (`lf20_mbe92lrm.json`) ne répond
 * plus (hotlink bloqué côté LottieFiles — 403 vérifié), d'où un asset
 * local versionné aux couleurs Relio. */
export function RegisterMascot3D({
  completionPercentage,
  firstName = '',
  lastName = '',
}: {
  completionPercentage: number;
  firstName?: string;
  lastName?: string;
}) {
  const percent = Math.min(100, Math.max(0, Math.round(completionPercentage)));
  const fullName = `${firstName} ${lastName}`.trim();
  const initial = (firstName || lastName || 'R').trim().charAt(0).toUpperCase();

  return (
    <div className="flex flex-col items-center justify-between h-full min-h-[500px] lg:min-h-[600px] w-full p-6 sm:p-8 relative overflow-hidden bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl">
      {/* Halo lumineux orange */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-24 size-64 -translate-x-1/2 rounded-full bg-orange-500/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-16 -right-16 size-56 rounded-full bg-orange-500/10 blur-3xl" />

      {/* Badge de progression */}
      <div className="relative w-full flex justify-between items-center text-xs font-semibold text-gray-300">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" aria-hidden />
          Assistant de création
        </span>
        <span className="px-3 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full" aria-live="polite">
          {percent}%
        </span>
      </div>

      {/* Animation Lottie */}
      <div className="relative w-full max-w-[280px] my-6">
        <TechnicianLottie className="h-auto w-full" />
      </div>

      {/* Carte d'aperçu client en direct */}
      <div className="relative w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-left backdrop-blur-md">
        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Votre profil Relio</p>
        <div className="flex items-center gap-3 mt-2">
          <div aria-hidden className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center font-bold text-white text-sm shadow-md">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {fullName || 'Nouveau Client Relio'}
            </p>
            <p className="text-xs text-gray-400">Dépannage à domicile instantané</p>
          </div>
        </div>
      </div>

      {/* Message d'encouragement */}
      <p className="relative text-xs text-gray-400 text-center mt-4" aria-live="polite">
        {percent < 50
          ? 'Remplissez vos coordonnées pour activer votre compte client.'
          : 'Presque terminé ! Plus qu’un clic pour finaliser.'}
      </p>
    </div>
  );
}
