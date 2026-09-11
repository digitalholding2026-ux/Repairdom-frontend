import type { ReactNode } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { RoleGuard } from '@/components/auth/role-guard';
import { siteConfig } from '@/lib/site-config';

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur safe-top">
        <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between px-4">
          <Link href="/admin/kyc" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Icon name="shield" size="sm" strokeWidth={2.2} />
            </span>
            <span className="text-base font-bold tracking-tight">{siteConfig.name}</span>
          </Link>
          <Badge variant="info">Back-office</Badge>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <RoleGuard expectedRole="ADMIN" publicPaths={[]}>
          {children}
        </RoleGuard>
      </main>

      <nav className="border-t border-border bg-background/90 backdrop-blur safe-bottom">
        <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-around px-4">
          <Link href="/admin/kyc" className="flex flex-col items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            <Icon name="badge-check" size="sm" />
            KYC
          </Link>
          <Link href="/admin/missions" className="flex flex-col items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            <Icon name="search" size="sm" />
            Missions
          </Link>
          <Link href="/admin/catalog" className="flex flex-col items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            <Icon name="wrench" size="sm" />
            Catalogue
          </Link>
          <Link href="/admin/finances" className="flex flex-col items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            <Icon name="shield-check" size="sm" />
            Finances
          </Link>
        </div>
      </nav>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} {siteConfig.name}. Tous droits réservés.</p>
      </footer>
    </div>
  );
}