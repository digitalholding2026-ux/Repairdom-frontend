'use client';

import { type ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  { href: '/admin/demandes', label: 'Demandes', icon: 'search' },
  { href: '/admin/catalogue', label: 'Catalogue', icon: 'wrench' },
  { href: '/admin/clients', label: 'Clients B2B', icon: 'users' },
  { href: '/admin/finances', label: 'Finances', icon: 'wallet' },
  { href: '/admin/parametres', label: 'Paramètres', icon: 'settings' },
];

function isNavActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname() ?? '';
  const { authenticated, user, loading } = useAuth();
  const showChrome = authenticated && user?.role === 'ADMIN';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logoutAndGoHome();
  };

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <ScrollToTop />
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur safe-top">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground lg:hidden"
              aria-label="Ouvrir le menu"
              onClick={() => setMobileOpen(true)}
            >
              <Icon name="menu" size="sm" />
            </button>
            <Link href="/admin" className="flex items-center gap-2">
              <span className="text-lg font-bold text-relio-orange">Relio</span>
              <Badge variant="info">Admin</Badge>
            </Link>
          </div>
          {loading ? null : showChrome ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {user?.email ?? user?.firstName ?? 'Admin'}
              </span>
              <UserAvatar href="/admin" />
              <Button variant="ghost" size="icon" onClick={handleLogout} isLoading={loggingOut} aria-label="Se déconnecter">
                <Icon name="logout" size="sm" />
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <aside className="sticky top-20 hidden h-[calc(100vh-6rem)] w-60 shrink-0 lg:block">
          <nav className="space-y-1 rounded-2xl border border-border bg-card p-2 shadow-sm">
            {ADMIN_NAV.map((item) => {
              const active = isNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-relio-orange/10 text-relio-orange'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )}
                >
                  <Icon name={item.icon} size="sm" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {mobileOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <nav className="absolute left-0 top-0 h-full w-72 space-y-1 bg-card p-4 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-lg font-bold text-relio-orange">Relio Admin</span>
                <button type="button" className="h-9 w-9 rounded-lg" aria-label="Fermer" onClick={() => setMobileOpen(false)}>
                  <Icon name="x" size="sm" />
                </button>
              </div>
              {ADMIN_NAV.map((item) => {
                const active = isNavActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
                      active ? 'bg-relio-orange/10 text-relio-orange' : 'text-slate-600 hover:bg-slate-100',
                    )}
                  >
                    <Icon name={item.icon} size="sm" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        ) : null}

        <main className="min-w-0 flex-1 pb-6 lg:pb-6">
          <RoleGuard expectedRole="ADMIN" publicPaths={[]}>
            {children}
          </RoleGuard>
        </main>
      </div>
    </div>
  );
}
