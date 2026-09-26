'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ClientAuthForm } from '@/components/client/client-auth-form';
import { RegisterBrandPanel } from '@/components/auth/RegisterBrandPanel';
import { Icon } from '@/components/ui/icon';

/* Page d'inscription : fond lumineux en dégradé + halos, double colonne
 * harmonieuse (panneau de réassurance | formulaire contrasté).
 * Le seul logo affiché est celui du header du layout — aucun doublon. */
export function RegisterSplit() {
  const [percent, setPercent] = useState(0);

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 min-h-screen text-slate-100 relative overflow-hidden flex flex-col justify-center items-center py-8 px-4 sm:px-6 lg:px-8">
      {/* Halos lumineux d'ambiance */}
      <div aria-hidden className="absolute -top-40 -left-40 w-96 h-96 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Colonne gauche : panneau de réassurance */}
        <div className="lg:col-span-5 flex">
          <RegisterBrandPanel />
        </div>

        {/* Colonne droite : formulaire soigné & contrasté */}
        <div className="lg:col-span-7 flex">
          <div className="bg-slate-900/70 backdrop-blur-xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 w-full">
            {/* Barre de progression */}
            <div role="group" aria-label="Progression du formulaire">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-semibold text-slate-300">Complétion du formulaire</p>
                <p className="text-sm font-semibold text-orange-400" aria-live="polite">{percent}%</p>
              </div>
              <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-white/10" aria-hidden>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-[width] duration-500 ease-out"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-semibold">
                <Icon name="sparkles" size="sm" />
                Inscription client
              </span>
              <h1 className="mt-3 text-xl font-bold tracking-tight text-white sm:text-2xl">
                Créer votre compte client
              </h1>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">
                Remplissez le formulaire pour déposer vos demandes de dépannage en toute confiance.
              </p>
            </div>

            {/* Champs éclaircis (surcharges ciblées du formulaire partagé) */}
            <div className="[&_label]:text-slate-100 [&_input]:bg-slate-800/80 [&_input]:border-slate-700/80 [&_input]:text-white [&_input]:placeholder:text-slate-400 [&_input]:shadow-inner [&_input]:focus:border-orange-500 [&_input]:focus-visible:ring-orange-500/30 [&_select]:bg-slate-800/80 [&_select]:border-slate-700/80 [&_select]:text-white [&_option]:bg-slate-900 [&_option]:text-white [&_.text-muted-foreground]:text-slate-300 [&_.text-error-ink]:text-red-300 [&_.text-success-ink]:text-emerald-300">
              <ClientAuthForm mode="signup" dark onProgressChange={setPercent} />
            </div>

            <p className="text-center text-sm text-slate-300">
              Déjà client ?{' '}
              <Link href="/client/connexion" className="font-medium text-orange-400 underline-offset-4 hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
