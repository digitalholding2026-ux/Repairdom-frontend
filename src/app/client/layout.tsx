'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BottomNav } from '@/components/ui/bottom-nav';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ScrollToTop } from '@/components/ui/scroll-to-top';
import { BrandLogo } from '@/components/public/brand-logo';
import { UserAvatar } from '@/components/ui/user-avatar';
import { RoleGuard } from '@/components/auth/role-guard';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { useAuth } from '@/components/auth/auth-provider';
import { WorkspaceSidebar, type WorkspaceNavItem } from '@/components/ui/workspace-sidebar';

const CLIENT_NAV: WorkspaceNavItem[] = [
  { href: '/client', label: 'Vue d’ensemble', icon: 'home' },
  { href: '/client/demandes', label: 'Mes missions', icon: 'briefcase' },
  { href: '/client/chronologies', label: 'Chronologies', icon: 'clock' },
  { href: '/client/notifications', label: 'Notifications', icon: 'bell', notifications: true },
  { href: '/client/solde', label: 'Mon solde', icon: 'file' },
  { href: '/client/recompenses', label: 'Récompenses', icon: 'sparkles' },
  { href: '/client/profil', label: 'Mon profil', icon: 'user' },
];

const CLIENT_PUBLIC_PATHS = [
  '/client/connexion',
  '/client/inscription',
  '/client/verification',
];

export default function ClientLayout({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname() ?? '';
  const { user, authenticated, loading } = useAuth();
  const isPublicPath = CLIENT_PUBLIC_PATHS.includes(pathname);
  const showPrivateChrome = authenticated && user?.role === 'CLIENT';
  /* Accueil Neero-style : le dashboard fournit son propre header sombre
   * immersif (top bar + carte solde) — le header global est masqué ici
   * pour éviter toute duplication. */
  const isNeeroHome = pathname === '/client';
  /* Connexion, inscription ET vérification partagent le même traitement
   * immersif : la coquille pose son propre logo (et, pour la vérification,
   * le centré de la page), donc le header global créerait un doublon. La
   * vérification n'utilise pas la coquille split — elle a sa propre carte —
   * mais elle reste une page d'attente immersive, sans navigation. */
  const isImmersiveAuth =
    pathname === '/client/inscription' ||
    pathname === '/client/connexion' ||
    pathname === '/client/verification';
  const hideGlobalHeader = (isNeeroHome && showPrivateChrome) || isImmersiveAuth;
  /* La vérification garde une largeur de lecture : passer en pleine largeur
   * étirerait sa carte sur tout l'écran de bureau. */
  const isFullBleed =
    (isImmersiveAuth && pathname !== '/client/verification') ||
    (isNeeroHome && showPrivateChrome);

  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollToTop />
      {hideGlobalHeader ? null : (
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur safe-top">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <BrandLogo href={showPrivateChrome ? '/client' : '/'} />
          <div className="flex items-center gap-2">
            {loading ? (
              <Spinner size="sm" className="border-muted-foreground/30 border-t-muted-foreground" />
            ) : showPrivateChrome ? (
              <>
                <NotificationBell href="/client/notifications" />
                <UserAvatar href="/client/profil" />
              </>
            ) : (
              <Link href="/client/connexion">
                <Button variant="ghost" size="sm">
                  Se connecter
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>
      )}

      <div className={`mx-auto flex w-full flex-1 items-start gap-8 ${showPrivateChrome && !isFullBleed ? 'max-w-7xl px-4 py-6 sm:px-6 lg:px-8' : isFullBleed ? 'max-w-none px-0 py-0' : 'max-w-lg px-4 py-6'}`}>
        {showPrivateChrome && !isPublicPath ? (
          <WorkspaceSidebar
            label="Espace client"
            items={CLIENT_NAV}
            action={{ href: '/demande', label: 'Nouvelle demande', icon: 'plus' }}
          />
        ) : null}
        <main className="min-w-0 w-full flex-1 overflow-x-clip pb-28 lg:pb-10">
          <div key={pathname} className="animate-slide-up">
            <RoleGuard expectedRole="CLIENT" publicPaths={CLIENT_PUBLIC_PATHS}>
              {children}
            </RoleGuard>
          </div>
        </main>
      </div>

      {showPrivateChrome && !isPublicPath ? (
        <div className="lg:hidden">
          <BottomNav
            items={[
              { href: '/client', label: 'Accueil', icon: 'home' },
              { href: '/client/demandes', label: 'Missions', icon: 'briefcase' },
              { href: '/client/solde', label: 'Solde', icon: 'wallet' },
              { href: '/client/profil', label: 'Profil', icon: 'user' },
            ]}
            /* CHANTIER NAVIGATION P1/P2 — sections desktop accessibles
             * sur mobile via « Plus » (jamais de bouton minuscule). */
            moreItems={[
              { href: '/client/chronologies', label: 'Chronologies', icon: 'clock' },
              { href: '/client/notifications', label: 'Notifications', icon: 'bell', notifications: true },
              { href: '/client/recompenses', label: 'Récompenses', icon: 'sparkles' },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}
