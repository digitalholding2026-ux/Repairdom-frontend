'use client';

import { type ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/ui/bottom-nav';
import { Icon, type IconName } from '@/components/ui/icon';
import { ScrollToTop } from '@/components/ui/scroll-to-top';
import { UserAvatar } from '@/components/ui/user-avatar';
import { RoleGuard } from '@/components/auth/role-guard';
import { useAuth } from '@/components/auth/auth-provider';
import { logoutAndGoHome } from '@/lib/api/auth-service';
import { siteConfig } from '@/lib/site-config';
import { cn } from '@/lib/cn';

interface AdminNavItem {
  href: string;
  label: string;
  icon: IconName;
}

const ADMIN_NAV: AdminNavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: 'home' },
  { href: '/admin/missions', label: 'Missions', icon: 'search' },
  { href: '/admin/kyc', label: 'KYC', icon: 'badge-check' },
  { href: '/admin/catalog', label: 'Catalogue', icon: 'wrench' },
  { href: '/admin/catalog/villes', label: 'Villes & zones', icon: 'pin' },
  { href: '/admin/finances', label: 'Finances', icon: 'file' },
];

function isNavActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname() ?? '';
  const { authenticated, user, loading } = useAuth();
  const showChrome = authenticated && user?.role === 'ADMIN';
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logoutAndGoHome();
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollToTop />
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur safe-top">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 lg:px-6">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Icon name="shield" size="sm" strokeWidth={2.2} />
            </span>
            <span className="text-base font-bold tracking-tight">{siteConfig.name}</span>
          </Link>
          {loading ? (
            <span
              className="size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"
              aria-hidden
            />
          ) : showChrome ? (
            <div className="flex items-center gap-2">
              <Badge variant="info">Back-office</Badge>
              <UserAvatar href="/admin" />
              <Button
                variant="ghost"
                size="icon"
                className="size-9"
                onClick={handleLogout}
                isLoading={loggingOut}
                aria-label="Se déconnecter"
              >
                <Icon name="logout" size="sm" />
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 items-start gap-8 px-4 py-6 lg:px-6">
        {showChrome ? (
          <aside className="sticky top-20 hidden w-60 shrink-0 lg:block" aria-label="Navigation admin">
            <nav className="space-y-1 rounded-2xl border border-border bg-card p-2">
              {ADMIN_NAV.map((item) => {
                const active = isNavActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon name={item.icon} size="sm" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        ) : null}

        <main className="min-w-0 flex-1 pb-28 lg:pb-10">
          <div key={pathname} className="animate-slide-up">
            <RoleGuard expectedRole="ADMIN" publicPaths={[]}>
              {children}
            </RoleGuard>
          </div>
        </main>
      </div>

      {showChrome ? (
        <div className="lg:hidden">
          <BottomNav
            items={[
              { href: '/admin/kyc', label: 'KYC', icon: 'badge-check' },
              { href: '/admin/missions', label: 'Missions', icon: 'search' },
              { href: '/admin/catalog', label: 'Catalogue', icon: 'wrench' },
              { href: '/admin/finances', label: 'Finances', icon: 'file' },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}