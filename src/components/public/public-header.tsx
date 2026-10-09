'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { BrandLogo } from './brand-logo';
import { MenuNavAnimation } from '@/components/lottie/lottie-animations';
import { useAuth } from '@/components/auth/auth-provider';
import { homePathForRole } from '@/lib/api/auth-service';
import { cn } from '@/lib/cn';

export function PublicHeader() {
  const { user, authenticated, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  /* `document.body` n'existe pas au rendu serveur : le portail ne peut être
   * construit qu'après le premier passage côté client. Sans cet état, le
   * drawer ne s'afficherait jamais dans le HTML servi. */
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Menu mobile : verrouille le scroll + fermeture via Échap. */
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const closeMenu = () => setIsOpen(false);

  return (
    <header
      className={cn(
        'sticky top-0 z-20 border-b backdrop-blur transition-all duration-300 safe-top',
        scrolled
          ? 'border-border bg-background/95 shadow-card'
          : 'border-transparent bg-background/70',
      )}
    >
      <div
        className={cn(
          'mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 transition-all duration-300 sm:px-6 lg:px-8',
          scrolled ? 'h-12' : 'h-14',
        )}
      >
        <BrandLogo href="/" />
        {/* Desktop (lg+) : navigation complète + CTA */}
        <nav className="hidden items-center gap-2 lg:flex" aria-label="Navigation principale">
          {loading ? (
            <Spinner size="sm" className="border-muted-foreground/30 border-t-muted-foreground" />
          ) : authenticated ? (
            <>
              <Link href={homePathForRole(user?.role)}>
                <Button variant="ghost" size="sm">
                  Mon espace
                </Button>
              </Link>
              {user?.role === 'CLIENT' ? (
                <Link href='/demande'>
                  <Button size="sm" className="whitespace-nowrap">
                    Déposer une demande
                  </Button>
                </Link>
              ) : null}
            </>
          ) : (
            <>
              <div className="mr-3 flex items-center gap-6">
                <Link href="/#services-title" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                  Services
                </Link>
                <Link href="/#how-title" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                  Comment ça marche
                </Link>
                <Link href="/devenir-technicien" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                  Devenir technicien
                </Link>
              </div>
              <Link href="/client/connexion">
                <Button variant="ghost" size="sm">
                  Connexion
                </Button>
              </Link>
              <Link href="/client/inscription">
                <Button size="sm" className="whitespace-nowrap">
                  J&apos;ai besoin d&apos;un dépannage
                </Button>
              </Link>
            </>
          )}
        </nav>
        {/* Mobile (< lg) : CTA compact + burger */}
        <div className="flex items-center gap-2 lg:hidden">
          {loading ? (
            <Spinner size="sm" className="border-muted-foreground/30 border-t-muted-foreground" />
          ) : authenticated ? (
            <Link href={homePathForRole(user?.role)} onClick={closeMenu}>
              <Button variant="ghost" size="sm">
                Mon espace
              </Button>
            </Link>
          ) : (
            <Link href="/client/inscription" onClick={closeMenu}>
              <Button size="sm" className="min-h-11 whitespace-nowrap">
                Dépannage
              </Button>
            </Link>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {/* LottieFlow menu (MOBILE uniquement — ce bloc est lg:hidden) :
              * rejoue une fois à chaque toggle, états/aria conservés. */}
            <MenuNavAnimation playKey={isOpen ? 'open' : 'closed'} />
          </button>
        </div>
      </div>

      {/* Drawer mobile : overlay sombre translucide avec tous les liens + CTA.
       *
       * ⚠️ PORTAL OBLIGATOIRE — ne pas revenir à un rendu ancré ici.
       * Le `<header>` porte `backdrop-blur` + `sticky` + `transition-all`. Or
       * `backdrop-filter` fait de l'élément un BLOC CONTENEUR pour ses
       * descendants `position: fixed` : un `fixed inset-0` ancré ici se
       * résolvait contre la hauteur du header (~56 px) au lieu du viewport.
       * Résultat : drawer hauts de 56 px, fond ne couvrant que la bande du
       * header, et liens débordant par-dessus le hero sur fond transparent.
       * Rendu dans `document.body`, le drawer sort de ce contexte et couvre
       * réellement l'écran. */}
      {isOpen && mounted
        ? createPortal(
        <div
          className="fixed inset-0 z-50 bg-relio-bg/95 backdrop-blur-md lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navigation"
          /* Fermeture au clic sur le fond : `target === currentTarget` ne
           * se produit que si le clic atteint le calque lui-même, jamais un
           * lien, le logo ou le bouton de fermeture. */
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <div className="flex h-full flex-col px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4">
            <div className="flex h-14 items-center justify-between">
              <BrandLogo href="/" />
              <button
                type="button"
                onClick={closeMenu}
                aria-label="Fermer le menu"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/20 text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon name="x" size="md" />
              </button>
            </div>
            <nav className="mt-6 flex flex-col gap-1 text-white" aria-label="Navigation mobile">
              <Link href="/#services-title" onClick={closeMenu} className="rounded-xl px-4 py-3.5 text-base font-medium transition-colors hover:bg-white/10">
                Services
              </Link>
              <Link href="/#how-title" onClick={closeMenu} className="rounded-xl px-4 py-3.5 text-base font-medium transition-colors hover:bg-white/10">
                Comment ça marche
              </Link>
              <Link href="/devenir-technicien" onClick={closeMenu} className="rounded-xl px-4 py-3.5 text-base font-medium transition-colors hover:bg-white/10">
                Devenir technicien
              </Link>
            </nav>
            <div className="mt-auto flex flex-col gap-3">
              {authenticated ? (
                <Link href={homePathForRole(user?.role)} onClick={closeMenu}>
                  <Button size="lg" className="min-h-12 w-full text-sm sm:text-base">
                    Mon espace
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/client/inscription" onClick={closeMenu}>
                    <Button size="lg" className="min-h-12 w-full text-sm sm:text-base">
                      J&apos;ai besoin d&apos;un dépannage
                    </Button>
                  </Link>
                  <Link href="/client/connexion" onClick={closeMenu}>
                    <Button variant="ghost" size="lg" className="min-h-12 w-full border border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 text-sm sm:text-base">
                      Connexion
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )
      : null}
    </header>
  );
}
