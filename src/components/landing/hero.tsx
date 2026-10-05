'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { useAuth } from '@/components/auth/auth-provider';
import { homePathForRole } from '@/lib/api/auth-service';
import { HeroBackground } from './hero-background';

/* Hero — bandeau d'acquisition, une seule promesse et un seul CTA principal.
 *
 * ⚠️ AUCUN CHIFFRE INVENTÉ : l'ancien badge « 4.9/5 (+5 000 interventions
 * réussies) » était un littéral sans source de données et a été SUPPRIMÉ.
 * Les seuls chiffres affichés sur la landing proviennent de `GET /api/cities`
 * (endpoint public), dans le bloc Preuves sociales.
 *
 * Visuel : `/hero/hero_main.webp` (identité Relio : technicien en casquette +
 * pin orange), composition 50/50 sur desktop, empilé sur mobile.
 * Le PNG source (1536x730, 1,6 Mo) a été converti en WebP 1200x570 (80 Ko,
 * −95 %) : impact bandwidth décisif sur mobile Cameroun. */
export function Hero() {
  const { user, authenticated } = useAuth();
  const primaryHref = authenticated ? homePathForRole(user?.role) : '/client/demande';
  const primaryLabel = authenticated ? 'Continuer ma mission' : 'Décrire ma panne';

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-orange-500/10 via-slate-50 to-white px-4 pt-10 pb-10 sm:pt-14 sm:pb-14">
      <HeroBackground />

      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          {/* ── Colonne texte : sur mobile elle passe en premier ── */}
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Votre réparation à domicile, simple, rapide, sécurisée.
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-base text-slate-600 sm:text-lg lg:mx-0">
              Décrivez votre panne, un technicien vérifié se déplace chez vous. Vous ne payez
              qu&apos;après avoir validé le travail.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href={primaryHref}
                className="brand-gradient flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-bold text-white shadow-lg shadow-orange-500/25 transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 active:scale-[0.99] sm:w-auto"
              >
                {primaryLabel}
                <Icon name="arrow-right" size="md" strokeWidth={2.4} />
              </Link>
              <Link
                href="/devenir-technicien"
                className="flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-6 py-4 text-base font-semibold text-slate-700 backdrop-blur-sm transition hover:border-orange-300 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 sm:w-auto"
              >
                <Icon name="briefcase" size="sm" />
                Devenir technicien
              </Link>
            </div>

            <Link
              href="/suivi"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 underline-offset-4 hover:text-orange-600 hover:underline"
            >
              <Icon name="pin" size="3.5" />
              Déjà une intervention ? Suivre avec votre référence
            </Link>
          </div>

          {/* ── Colonne visuelle : dessous sur mobile, à droite sur desktop ── */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-float">
              <Image
                src="/hero/hero_main.webp"
                alt="Technicien Relio en intervention, accompagné du pin orange Relio"
                width={1200}
                height={570}
                priority
                sizes="(max-width: 1023px) 90vw, 45vw"
                className="h-auto w-full"
              />
            </div>
            {/* Halo ambré cohérent avec le pin : ancre la composition. */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-6 -bottom-6 -z-10 size-32 rounded-full bg-orange-500/20 blur-3xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}