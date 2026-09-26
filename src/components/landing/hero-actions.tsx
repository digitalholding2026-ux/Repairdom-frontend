'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useAuth } from '@/components/auth/auth-provider';
import { homePathForRole } from '@/lib/api/auth-service';
import { cn } from '@/lib/cn';

/** Rangée d'actions du hero : personnalisée selon l'état de connexion.
 * Affichée en bas-gauche de la bannière full-width en boutons translucides
 * (glassmorphism) pour ne pas masquer le texte ni le visage de l'affiche.
 * `stacked` force l'empilement vertical (conservé pour compatibilité). */
export function HeroActions({ stacked = false }: { stacked?: boolean }) {
  const { user, authenticated, loading } = useAuth();

  const rowClass = stacked
    ? 'flex w-full flex-col items-stretch gap-2.5'
    : 'flex flex-wrap items-center gap-4';
  const linkClass = stacked ? 'w-full' : 'w-auto';
  const primaryBtnClass =
    'group relative bg-[#F97316]/30 backdrop-blur-md border border-[#F97316]/50 text-white hover:bg-[#F97316]/50 shadow-lg shadow-orange-500/10 transition-all px-6 py-3 rounded-xl font-medium active:scale-[0.98]';
  const ghostBtnClass =
    'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all px-6 py-3 rounded-xl font-medium active:scale-[0.98]';

  if (!loading && authenticated) {
    const home = homePathForRole(user?.role);
    return (
      <div className="flex flex-col gap-3">
        <div className={rowClass}>
          <Link href={home} className={linkClass}>
            <Button size="lg" className={primaryBtnClass}>
              <span aria-hidden className="animate-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              Continuer ma mission
              <Icon name="arrow-right" size="sm" className="transition-transform group-hover:translate-x-0.5" />
            </Button>
          </Link>
          <Link href="/suivi" className={linkClass}>
            <Button
              variant="ghost"
              size="lg"
              className={ghostBtnClass}
            >
              <Icon name="pin" size="sm" />
              Suivre une intervention
            </Button>
          </Link>
        </div>
        <p
          className={cn(
            'mt-3 flex items-center gap-1.5 text-xs text-white/80 backdrop-blur-sm bg-black/20 px-3 py-1 rounded-lg w-fit',
            stacked && 'justify-center text-center',
          )}
        >
          <Icon name="sparkles" size="sm" className="text-amber-200" />
          Toujours prêt à vous aider — retrouvez vos missions au même endroit.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className={rowClass}>
        <Link href="/client/inscription" className={linkClass}>
          <Button size="lg" className={primaryBtnClass}>
            <span aria-hidden className="animate-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            J&apos;ai besoin d&apos;un dépannage
            <Icon name="arrow-right" size="sm" className="transition-transform group-hover:translate-x-0.5" />
          </Button>
        </Link>
        <Link href="/client/connexion" className={linkClass}>
          <Button
            variant="ghost"
            size="lg"
            className={ghostBtnClass}
          >
            J&apos;ai déjà un compte
          </Button>
        </Link>
      </div>
      <Link
        href="/suivi"
        className={cn(
          'mt-3 inline-flex items-center gap-1.5 text-xs text-white/80 backdrop-blur-sm bg-black/20 px-3 py-1 rounded-lg w-fit font-medium underline-offset-4 hover:underline',
          stacked && 'flex justify-center text-center',
        )}
      >
        <Icon name="pin" size="sm" />
        Vous suivez déjà une intervention ? Renseignez sa référence ici.
      </Link>
    </div>
  );
}
