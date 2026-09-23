'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { BrandLogo } from './brand-logo';
import { useAuth } from '@/components/auth/auth-provider';
import { homePathForRole } from '@/lib/api/auth-service';
import { cn } from '@/lib/cn';

export function PublicHeader() {
  const { user, authenticated, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
        <nav className="flex items-center gap-2" aria-label="Navigation principale">
          {loading ? (
            <Spinner size="sm" className="border-muted-foreground/30 border-t-muted-foreground" />
          ) : authenticated ? (
            <>
              <Link href={homePathForRole(user?.role)}>
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                  Mon espace
                </Button>
              </Link>
              {user?.role === 'CLIENT' ? (
                <Link href="/client/demande">
                  <Button size="sm" className="whitespace-nowrap">
                    <span className="hidden sm:inline">Déposer une demande</span>
                    <span className="sm:hidden">Dépannage</span>
                  </Button>
                </Link>
              ) : (
                <Link href={homePathForRole(user?.role)}>
                  <Button size="sm" className="sm:hidden">
                    Mon espace
                  </Button>
                </Link>
              )}
            </>
          ) : (
            <>
              <div className="mr-3 hidden items-center gap-6 md:flex">
                <Link href="/#categories-title" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
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
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                  Connexion
                </Button>
              </Link>
              <Link href="/client/inscription">
                <Button size="sm" className="whitespace-nowrap">
                  <span className="hidden sm:inline">J&apos;ai besoin d&apos;un dépannage</span>
                  <span className="sm:hidden">Dépannage</span>
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
