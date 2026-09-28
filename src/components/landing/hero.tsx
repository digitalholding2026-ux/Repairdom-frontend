'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { useAuth } from '@/components/auth/auth-provider';
import { homePathForRole } from '@/lib/api/auth-service';

/* Hero compact style Apple/Uber : dégradé subtil, badge de preuve,
 * titre centré, CTA XL unique + lien suivi discret. */
export function Hero() {
  const { user, authenticated } = useAuth();
  const primaryHref = authenticated ? homePathForRole(user?.role) : '/client/inscription';

  return (
    <section className="bg-gradient-to-b from-orange-500/10 via-slate-50 to-white px-4 pb-6 pt-8">
      <div className="mx-auto w-full max-w-xl text-center">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-600">
          <span aria-hidden>⭐</span>
          4.9/5 (+5 000 interventions réussies)
        </p>
        <h1 className="mx-auto max-w-xl text-center text-2xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Le dépannage à domicile rapide, clair et sécurisé.
        </h1>
        <p className="mx-auto mt-2 max-w-md text-center text-sm text-slate-600">
          Décrivez votre panne, recevez un devis garanti et suivez votre technicien certifié.
        </p>
        <Link
          href={primaryHref}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500/90 py-4 text-base font-bold text-white shadow-lg shadow-orange-500/20 backdrop-blur-sm transition hover:bg-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 active:scale-[0.99]"
        >
          {authenticated ? 'Continuer ma mission' : "J'ai besoin d'un dépannage"}
          <Icon name="arrow-right" size="md" strokeWidth={2.4} />
        </Link>
        <Link
          href="/suivi"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 underline-offset-4 hover:text-orange-600 hover:underline"
        >
          <Icon name="pin" size="3.5" />
          Déjà une intervention ? Suivre avec votre référence
        </Link>
      </div>
    </section>
  );
}
