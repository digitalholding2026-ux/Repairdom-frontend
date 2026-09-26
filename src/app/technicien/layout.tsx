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
import { useAuth } from '@/components/auth/auth-provider';
import { WorkspaceSidebar, type WorkspaceNavItem } from '@/components/ui/workspace-sidebar';

const TECHNICIAN_NAV: WorkspaceNavItem[] = [
  { href: '/technicien', label: 'Vue d’ensemble', icon: 'home' },
  { href: '/technicien/demandes', label: 'Missions', icon: 'wrench' },
  { href: '/technicien/chronologies', label: 'Chronologies', icon: 'clock' },
  { href: '/technicien/historique', label: 'Historique', icon: 'badge-check' },
  { href: '/technicien/revenus', label: 'Revenus', icon: 'briefcase' },
  { href: '/technicien/notifications', label: 'Notifications', icon: 'bell', notifications: true },
  { href: '/technicien/zones', label: 'Zones couvertes', icon: 'pin' },
  { href: '/technicien/profil', label: 'Mon profil', icon: 'user' },
];

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
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <BrandLogo href={showPrivateChrome ? '/technicien' : '/'} />
          <div className="flex items-center gap-2">
            {loading ? (
              <Spinner size="sm" className="border-muted-foreground/30 border-t-muted-foreground" />
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

      <div className={`mx-auto flex w-full flex-1 items-start gap-8 py-6 ${showPrivateChrome ? 'max-w-7xl px-4 sm:px-6 lg:px-8' : 'max-w-lg px-4'}`}>
        {showPrivateChrome && !isPublicPath ? (
          <WorkspaceSidebar label="Espace technicien" items={TECHNICIAN_NAV} />
        ) : null}
        <main className="min-w-0 w-full flex-1 overflow-x-clip pb-28 lg:pb-10">
          <div key={pathname} className="animate-slide-up">
            <RoleGuard expectedRole="TECHNICIAN" publicPaths={TECHNICIAN_PUBLIC_PATHS}>
              {children}
            </RoleGuard>
          </div>
        </main>
      </div>

      {showPrivateChrome && !isPublicPath ? (
        <div className="lg:hidden">
          <BottomNav
            items={[
              { href: '/technicien', label: 'Accueil', icon: 'home' },
              { href: '/technicien/demandes', label: 'Demandes', icon: 'wrench' },
              { href: '/technicien/chronologies', label: 'Chronologies', icon: 'clock' },
              { href: '/technicien/revenus', label: 'Revenus', icon: 'briefcase' },
              { href: '/technicien/notifications', label: 'Notifications', icon: 'bell', notifications: true },
              { href: '/technicien/profil', label: 'Profil', icon: 'user' },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}
