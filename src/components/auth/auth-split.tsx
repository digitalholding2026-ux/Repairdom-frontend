'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import { BrandLogo } from '@/components/public/brand-logo';

/* Coquille partagée par /client/inscription et /client/connexion.
 *
 * Objectif : une seule identité visuelle pour tout le tunnel d'entrée.
 * Colonnes sur desktop (lg+) : formulaire | panneau de réassurance.
 * Sur mobile : logo, puis formulaire, puis réassurance (empilés).
 *
 * Le panneau de droite ne annonce AUCUN chiffre ni délai inventé : uniquement
 * les garanties réellement appliquées par le code (KYC, devis préalable,
 * paiement après validation, suivi par référence).
 *
 * `progress` : pourcentage de complétion du formulaire (inscription uniquement).
 * `dark` : les champs du formulaire partagé ont besoin de la surcharge sombre.
 */

export interface AuthGuarantee {
  title: string;
  text: string;
  icon: IconName;
}

const GUARANTEES: AuthGuarantee[] = [
  {
    title: 'Techniciens vérifiés',
    text: 'Identité contrôlée avant la mise en relation.',
    icon: 'badge-check',
  },
  {
    title: 'Devis avant travaux',
    text: 'Le prix est connu et accepté avant de commencer.',
    icon: 'file',
  },
  {
    title: 'Paiement après validation',
    text: 'Vous ne payez qu’une fois l’intervention terminée.',
    icon: 'shield',
  },
  {
    title: 'Suivi par référence',
    text: 'Un numéro unique pour suivre l’avancement à tout moment.',
    icon: 'pin',
  },
];

/**
 * Garanties du côté TECHNICIEN (chantier #5B).
 *
 * La liste par défaut est orientée CLIENT : elle promet au client un devis, un
 * paiement et une vérification d'identité. Affichée à un technicien qui
 * s'inscrit, elle serait fausse — il ne paie pas, il n'est pas « vérifié »
 * comme un client ne l'est pas, et c'est LUI dont l'identité est contrôlée
 * avant d'être mis en relation. On ne ment pas pour remplir un panneau.
 */
export const TECHNICIAN_GUARANTEES: AuthGuarantee[] = [
  {
    title: 'Missions dans vos zones',
    text: 'Vous ne recevez que les demandes de dépannage de votre secteur.',
    icon: 'pin',
  },
  {
    title: 'Identité vérifiée une fois',
    text: 'Contrôlez votre pièce d’identité, puis intervenez sans autre formalité.',
    icon: 'shield-check',
  },
  {
    title: 'Devis Systematic',
    text: 'Le prix de chaque intervention est validé avec le client avant de commencer.',
    icon: 'file',
  },
  {
    title: 'Paiement après validation',
    text: 'Vous êtes payé une fois l’intervention terminée et validée.',
    icon: 'wallet',
  },
];

export function AuthSplit({
  children,
  title,
  subtitle,
  badge,
  progress,
  footer,
  guarantees = GUARANTEES,
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
  progress?: number;
  footer?: ReactNode;
  /** Réassurance affichée à droite. Par défaut : la liste orientée client
   *  (`TECHNICIAN_GUARANTEES` pour le tunnel technicien). */
  guarantees?: AuthGuarantee[];
}) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-slate-950 text-slate-100">
      {/* Halos d'ambiance */}
      <div aria-hidden className="pointer-events-none absolute -top-40 -left-40 size-96 rounded-full bg-orange-500/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-40 -bottom-40 size-96 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:gap-16 lg:px-8">
        {/* ── Colonne formulaire ── */}
        <div className="w-full lg:max-w-lg">
          {/* Logo propre à la page : le header global est masqué sur ces
              routes (cf. client/layout.tsx), il n'y a donc pas de doublon. */}
          <div className="mb-6">
            <BrandLogo href="/" />
          </div>

          <div className="space-y-6 rounded-3xl border border-white/15 bg-slate-900/70 p-6 shadow-lg backdrop-blur-md sm:p-8">
            {progress !== undefined ? (
              <div role="group" aria-label="Progression du formulaire">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-300">Complétion du formulaire</p>
                  <p className="text-sm font-semibold text-orange-400 tabular-nums" aria-live="polite">
                    {progress}%
                  </p>
                </div>
                <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-white/10" aria-hidden>
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-[width] duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : null}

            <div>
              {badge ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/20 px-3 py-1 text-xs font-semibold text-orange-400">
                  <Icon name="sparkles" size="sm" />
                  {badge}
                </span>
              ) : null}
              <h1 className="mt-3 text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h1>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">{subtitle}</p>
            </div>

            {/* Surcharges ciblées du formulaire partagé pour le thème sombre */}
            <div className="[&_label]:text-slate-100 [&_input]:bg-slate-800/80 [&_input]:border-slate-700/80 [&_input]:text-white [&_input]:placeholder:text-slate-400 [&_input]:shadow-inner [&_input]:focus:border-orange-500 [&_input]:focus-visible:ring-orange-500/30 [&_select]:bg-slate-800/80 [&_select]:border-slate-700/80 [&_select]:text-white [&_option]:bg-slate-900 [&_option]:text-white [&_.text-muted-foreground]:text-slate-300 [&_.text-error-ink]:text-red-300 [&_.text-success-ink]:text-emerald-300">
              {children}
            </div>

            {footer}
          </div>
        </div>

        {/* ── Colonne réassurance ── */}
        <aside className="w-full lg:flex-1">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50">
            <div className="relative aspect-[16/10] w-full bg-slate-900">
              <Image
                src="/hero/hero_main.webp"
                alt="Technicien Relio en intervention"
                fill
                priority
                sizes="(max-width: 1023px) 90vw, 40vw"
                className="object-cover"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"
              />
            </div>

            <ul className="space-y-3 p-5 sm:p-6">
              {guarantees.map((item) => (
                <li key={item.title} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-400"
                  >
                    <Icon name={item.icon} size="sm" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">{item.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">
                      {item.text}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-4 text-center text-xs text-slate-400 lg:text-left">
            En continuant, vous acceptez nos{' '}
            <Link href="/conditions-utilisation" className="text-orange-400 underline-offset-4 hover:underline">
              conditions d&apos;utilisation
            </Link>
            .
          </p>
        </aside>
      </div>
    </div>
  );
}