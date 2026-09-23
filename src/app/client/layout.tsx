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

  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollToTop />
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur safe-top">
        <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between px-4">
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

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 pb-28">
        <div key={pathname} className="animate-slide-up">
          <RoleGuard expectedRole="CLIENT" publicPaths={CLIENT_PUBLIC_PATHS}>
            {children}
          </RoleGuard>
        </div>
      </main>

      {showPrivateChrome && !isPublicPath ? (
        <BottomNav
          items={[
            { href: '/client', label: 'Accueil', icon: 'home' },
            { href: '/client/demandes', label: 'Missions', icon: 'briefcase' },
            { href: '/client/solde', label: 'Solde', icon: 'file' },
            { href: '/client/profil', label: 'Profil', icon: 'user' },
          ]}
          primaryHref={{ href: '/client/demande', label: 'Déposer une demande', icon: 'plus' }}
        />
      ) : null}
    </div>
  );
}