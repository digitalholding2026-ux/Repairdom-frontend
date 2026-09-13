'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useAuth } from '@/components/auth/auth-provider';
import { homePathForRole } from '@/lib/api/auth-service';

/** Rangée d'actions du hero : personnalisée selon l'état de connexion. */
export function HeroActions() {
  const { user, authenticated, loading } = useAuth();

  if (!loading && authenticated) {
    const home = homePathForRole(user?.role);
    return (
      <div className="mt-1 w-full">
        <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:items-center">
          <Link href={home} className="w-full sm:w-auto">
            <Button
              size="lg"
              className="group relative w-full overflow-hidden font-semibold shadow-pop hover:-translate-y-0.5 active:scale-[0.98] sm:w-auto"
              style={{ backgroundColor: '#ffffff', color: '#4338ca' }}
            >
              <span aria-hidden className="animate-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-[#c7d2fe]/60 to-transparent" />
              Continuer ma mission
              <Icon name="arrow-right" size="sm" className="transition-transform group-hover:translate-x-0.5" />
            </Button>
          </Link>
          <Link href="/suivi" className="w-full sm:w-auto">
            <Button
              variant="ghost"
              size="lg"
              className="w-full border border-white/25 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 active:scale-[0.98] sm:w-auto"
            >
              <Icon name="pin" size="sm" />
              Suivre une intervention
            </Button>
          </Link>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-white/75">
          <Icon name="sparkles" size="sm" className="text-amber-200" />
          Toujours prêt à vous aider — retrouvez vos missions au même endroit.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-1 w-full">
      <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:items-center">
        <Link href="/client/inscription" className="w-full sm:w-auto">
          <Button
            size="lg"
            className="group relative w-full overflow-hidden font-semibold shadow-pop hover:-translate-y-0.5 active:scale-[0.98] sm:w-auto"
            style={{ backgroundColor: '#ffffff', color: '#4338ca' }}
          >
            <span aria-hidden className="animate-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-[#c7d2fe]/60 to-transparent" />
            J&apos;ai besoin d&apos;un dépannage
            <Icon name="arrow-right" size="sm" className="transition-transform group-hover:translate-x-0.5" />
          </Button>
        </Link>
        <Link href="/client/connexion" className="w-full sm:w-auto">
          <Button
            variant="ghost"
            size="lg"
            className="w-full border border-white/25 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 active:scale-[0.98] sm:w-auto"
          >
            J&apos;ai déjà un compte
          </Button>
        </Link>
      </div>
      <Link
        href="/suivi"
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-white/85 underline-offset-4 hover:underline"
      >
        <Icon name="pin" size="sm" />
        Vous suivez déjà une intervention ? Renseignez sa référence ici.
      </Link>
    </div>
  );
}