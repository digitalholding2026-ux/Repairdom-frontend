'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useAuth } from '@/components/auth/auth-provider';
import { homePathForRole } from '@/lib/api/auth-service';
import { cn } from '@/lib/cn';

/** Rangée d'actions du hero : personnalisée selon l'état de connexion.
 * `stacked` force l'empilement vertical centré (overlay au milieu de
 * l'image hero), sinon disposition responsive ligne sur desktop. */
export function HeroActions({ stacked = false }: { stacked?: boolean }) {
  const { user, authenticated, loading } = useAuth();

  const rowClass = stacked
    ? 'flex w-full flex-col items-stretch gap-2.5'
    : 'flex w-full flex-col gap-2.5 sm:flex-row sm:items-center';
  const linkClass = stacked ? 'w-full' : 'w-full sm:w-auto';
  const primaryBtnClass =
    'group relative w-full overflow-hidden bg-[#F97316] font-semibold text-white shadow-md shadow-[#F97316]/20 hover:-translate-y-0.5 hover:bg-[#FB923C] active:scale-[0.98]';
  const ghostBtnClass =
    'w-full border border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 active:scale-[0.98]';

  if (!loading && authenticated) {
    const home = homePathForRole(user?.role);
    return (
      <div className="mt-1 w-full">
        <div className={rowClass}>
          <Link href={home} className={linkClass}>
            <Button size="lg" className={cn(primaryBtnClass, !stacked && 'sm:w-auto')}>
              <span aria-hidden className="animate-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              Continuer ma mission
              <Icon name="arrow-right" size="sm" className="transition-transform group-hover:translate-x-0.5" />
            </Button>
          </Link>
          <Link href="/suivi" className={linkClass}>
            <Button
              variant="ghost"
              size="lg"
              className={cn(ghostBtnClass, !stacked && 'sm:w-auto')}
            >
              <Icon name="pin" size="sm" />
              Suivre une intervention
            </Button>
          </Link>
        </div>
        <p
          className={cn(
            'mt-3 flex items-center gap-1.5 text-xs text-white/75',
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
    <div className="mt-1 w-full">
      <div className={rowClass}>
        <Link href="/client/inscription" className={linkClass}>
          <Button size="lg" className={cn(primaryBtnClass, !stacked && 'sm:w-auto')}>
            <span aria-hidden className="animate-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            J&apos;ai besoin d&apos;un dépannage
            <Icon name="arrow-right" size="sm" className="transition-transform group-hover:translate-x-0.5" />
          </Button>
        </Link>
        <Link href="/client/connexion" className={linkClass}>
          <Button
            variant="ghost"
            size="lg"
            className={cn(ghostBtnClass, !stacked && 'sm:w-auto')}
          >
            J&apos;ai déjà un compte
          </Button>
        </Link>
      </div>
      <Link
        href="/suivi"
        className={cn(
          'mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-white/85 underline-offset-4 hover:underline',
          stacked && 'flex justify-center text-center',
        )}
      >
        <Icon name="pin" size="sm" />
        Vous suivez déjà une intervention ? Renseignez sa référence ici.
      </Link>
    </div>
  );
}
