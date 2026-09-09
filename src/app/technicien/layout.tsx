import type { ReactNode } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { BottomNav } from '@/components/ui/bottom-nav';
import { Icon } from '@/components/ui/icon';
import { RoleGuard } from '@/components/auth/role-guard';
import { siteConfig } from '@/lib/site-config';

const TECHNICIAN_PUBLIC_PATHS = ['/technicien/connexion', '/technicien/inscription'];

export default function TechnicianLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur safe-top">
        <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between px-4">
          <Link href="/technicien" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Icon name="wrench" size="sm" strokeWidth={2.2} />
            </span>
            <span className="text-base font-bold tracking-tight">{siteConfig.name}</span>
          </Link>
          <Badge variant="outline">Espace technicien</Badge>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 pb-28">
        <RoleGuard expectedRole="TECHNICIAN" publicPaths={TECHNICIAN_PUBLIC_PATHS}>
          {children}
        </RoleGuard>
      </main>

      <BottomNav
        items={[
          { href: '/technicien', label: 'Accueil', icon: 'home' },
          { href: '/technicien/profil', label: 'Profil', icon: 'user' },
        ]}
      />
    </div>
  );
}