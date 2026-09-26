'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ClientAuthForm } from '@/components/client/client-auth-form';
import { RegisterMascot, mascotStageForPercent } from '@/components/auth/register-mascot';
import { Icon } from '@/components/ui/icon';

/* Page d'inscription : layout split-screen moderne sur fond sombre uni.
 * - Desktop (lg+) : 2 colonnes (mascotte animée | formulaire glass).
 * - Mobile : empilé (mascotte compacte au-dessus du formulaire).
 * Le seul logo affiché est celui du header du layout — aucun doublon. */
export function RegisterSplit() {
  const [percent, setPercent] = useState(0);
  const stage = mascotStageForPercent(percent);

  return (
    <div className="min-h-screen w-full bg-[#0B0D12] text-white flex flex-col justify-center items-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Colonne gauche : mascotte animée */}
        <div className="lg:col-span-5">
          <RegisterMascot stage={stage} percent={percent} />
        </div>

        {/* Colonne droite : formulaire premium glassmorphism */}
        <div className="lg:col-span-7">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            {/* Barre de progression */}
            <div role="group" aria-label="Progression du formulaire">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-semibold text-slate-400">Complétion du formulaire</p>
                <p className="text-sm font-semibold text-[#F97316]" aria-live="polite">{percent}%</p>
              </div>
              <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-white/10" aria-hidden>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#F97316] to-[#EA580C] transition-[width] duration-500 ease-out"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F97316]/20 border border-[#F97316]/40 text-[#F97316] text-xs font-semibold">
                <Icon name="sparkles" size="sm" />
                Inscription client
              </span>
              <h1 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">
                Créer votre compte client
              </h1>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">
                Remplissez le formulaire pour déposer vos demandes de dépannage en toute confiance.
              </p>
            </div>

            {/* Champs en style sombre (surcharges ciblées du formulaire partagé) */}
            <div className="[&_label]:text-slate-100 [&_input]:border-white/15 [&_input]:bg-white/5 [&_input]:text-white [&_input]:placeholder:text-gray-400 [&_input]:focus:border-[#F97316] [&_input]:focus-visible:ring-[#F97316]/30 [&_select]:border-white/15 [&_select]:bg-white/5 [&_select]:text-white [&_option]:bg-[#151922] [&_option]:text-white [&_.text-muted-foreground]:text-slate-400 [&_.text-error-ink]:text-red-300 [&_.text-success-ink]:text-emerald-300">
              <ClientAuthForm mode="signup" dark onProgressChange={setPercent} />
            </div>

            <p className="text-center text-sm text-slate-400">
              Déjà client ?{' '}
              <Link href="/client/connexion" className="font-medium text-[#F97316] underline-offset-4 hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
