'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { BottomNav } from '@/components/ui/bottom-nav';
import { Icon } from '@/components/ui/icon';
import { ScrollToTop } from '@/components/ui/scroll-to-top';
import { RoleGuard } from '@/components/auth/role-guard';
import { useAuth } from '@/components/auth/auth-provider';
import { siteConfig } from '@/lib/site-config';

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname() ?? '';
  const { authenticated, user, loading } = useAuth();
  const showChrome = authenticated && user?.role === 'ADMIN';

  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollToTop />
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur safe-top">
        <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between px-4">
          <Link href="/admin/kyc" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Icon name="shield" size="sm" strokeWidth={2.2} />
            </span>
            <span className="text-base font-bold tracking-tight">{siteConfig.name}</span>
          </Link>
          {loading ? null : showChrome ? (
            <Badge variant="info">Back-office</Badge>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 pb-28">
        <div key={pathname} className="animate-slide-up">
          <RoleGuard expectedRole="ADMIN" publicPaths={[]}>
            {children}
          </RoleGuard>
        </div>
      </main>

      {showChrome ? (
        <BottomNav
          items={[
            { href: '/admin/kyc', label: 'KYC', icon: 'badge-check' },
            { href: '/admin/missions', label: 'Missions', icon: 'search' },
            { href: '/admin/catalog', label: 'Catalogue', icon: 'wrench' },
            { href: '/admin/finances', label: 'Finances', icon: 'file' },
          ]}
        />
      ) : null}
    </div>
  );
}