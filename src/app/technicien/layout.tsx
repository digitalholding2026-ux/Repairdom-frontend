'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BottomNav } from '@/components/ui/bottom-nav';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ScrollToTop } from '@/components/ui/scroll-to-top';
import { UserAvatar } from '@/components/ui/user-avatar';
import { RoleGuard } from '@/components/auth/role-guard';
import { useAuth } from '@/components/auth/auth-provider';
import { siteConfig } from '@/lib/site-config';

const TECHNICIAN_PUBLIC_PATHS = ['/technicien/connexion', '/technicien/inscription', '/technicien/verification'];

export default function TechnicianLayout({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname() ?? '';
  const { user, authenticated, loading } = useAuth();
  const isPublicPath = TECHNICIAN_PUBLIC_PATHS.includes(pathname);
  const showPrivateChrome = authenticated && user?.role === 'TECHNICIAN';

  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollToTop />
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur safe-top">
        <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between px-4">
          <Link
            href={showPrivateChrome ? '/technicien' : '/'}
            className="flex items-center gap-2"
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Icon name="wrench" size="sm" strokeWidth={2.2} />
            </span>
            <span className="text-base font-bold tracking-tight">{siteConfig.name}</span>
          </Link>
          <div className="flex items-center gap-2">
            {loading ? (
              <span className="size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" aria-hidden />
            ) : showPrivateChrome ? (
              <UserAvatar href="/technicien/profil" />
            ) : (
              <Link href="/technicien/connexion">
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
          <RoleGuard expectedRole="TECHNICIAN" publicPaths={TECHNICIAN_PUBLIC_PATHS}>
            {children}
          </RoleGuard>
        </div>
      </main>

      {showPrivateChrome && !isPublicPath ? (
        <BottomNav
          items={[
            { href: '/technicien', label: 'Accueil', icon: 'home' },
            { href: '/technicien/chronologies', label: 'Chronologies', icon: 'clock' },
            { href: '/technicien/revenus', label: 'Revenus', icon: 'briefcase' },
            { href: '/technicien/notifications', label: 'Notifications', icon: 'bell', notifications: true },
            { href: '/technicien/profil', label: 'Profil', icon: 'user' },
          ]}
        />
      ) : null}
    </div>
  );
}