'use client';

import { type ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { BrandLogo } from '@/components/public/brand-logo';
import { Icon, type IconName } from '@/components/ui/icon';
import { ScrollToTop } from '@/components/ui/scroll-to-top';
import { UserAvatar } from '@/components/ui/user-avatar';
import { RoleGuard } from '@/components/auth/role-guard';
import { useAuth } from '@/components/auth/auth-provider';
import { logoutAndGoHome } from '@/lib/api/auth-service';
import { cn } from '@/lib/cn';

interface AdminNavItem {
  href: string;
  label: string;
  icon: IconName;
}

const ADMIN_NAV: AdminNavItem[] = [
  { href: '/admin', label: 'Tableau de bord', icon: 'home' },
  { href: '/admin/missions', label: 'Missions', icon: 'search' },
  { href: '/admin/kyc', label: 'KYC', icon: 'badge-check' },
  { href: '/admin/catalog', label: 'Catalogue', icon: 'wrench' },
  { href: '/admin/catalog/villes', label: 'Villes & zones', icon: 'pin' },
  { href: '/admin/utilisateurs', label: 'Utilisateurs', icon: 'users' },
  { href: '/admin/communication', label: 'Communication', icon: 'send' },
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
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <BrandLogo href="/admin" />
          {loading ? (
            <Spinner size="sm" className="border-muted-foreground/30 border-t-muted-foreground" />
          ) : showChrome ? (
            <div className="flex items-center gap-2">
              <Badge variant="info">Espace admin</Badge>
              <UserAvatar href="/admin" />
              <Button
                variant="ghost"
                size="icon"
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

      <div className="mx-auto flex w-full max-w-7xl flex-1 items-start gap-6 px-4 py-6 sm:px-6 lg:gap-8 lg:px-8">
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
                      'flex items-center gap-3 rounded-xl border-l-4 border-transparent px-3 py-2.5 text-sm font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active
                        ? 'border-l-relio-orange bg-slate-100 font-semibold text-slate-900 dark:bg-white/5 dark:text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white',
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
          {/* Phase A : les 8 sections admin restent accessibles en mobile via
            * une rangée à défilement horizontal (la BottomNav à 4 items en
            * amputait 4). */}
          <nav
            aria-label="Navigation admin"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur"
          >
            <div className="flex gap-1 overflow-x-auto px-2">
              {ADMIN_NAV.map((item) => {
                const active = isNavActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-w-16 shrink-0 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-2xs font-medium',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active ? 'text-slate-900 dark:text-white' : 'text-muted-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-6 items-center justify-center rounded-full px-3',
                        active && 'bg-slate-100 dark:bg-white/10',
                      )}
                    >
                      <Icon name={item.icon} size="sm" strokeWidth={active ? 2.4 : 1.9} />
                    </span>
                    <span className="max-w-full truncate leading-none">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
