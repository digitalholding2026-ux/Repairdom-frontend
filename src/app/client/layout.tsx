import type { ReactNode } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { BottomNav } from '@/components/ui/bottom-nav';
import { Icon } from '@/components/ui/icon';
import { RoleGuard } from '@/components/auth/role-guard';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { siteConfig } from '@/lib/site-config';

const CLIENT_PUBLIC_PATHS = ['/client/connexion', '/client/inscription'];

export default function ClientLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur safe-top">
        <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between px-4">
          <Link href="/client" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Icon name="wrench" size="sm" strokeWidth={2.2} />
            </span>
            <span className="text-base font-bold tracking-tight">{siteConfig.name}</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell href="/client/notifications" />
            <Badge variant="outline">Espace client</Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 pb-28">
        <RoleGuard expectedRole="CLIENT" publicPaths={CLIENT_PUBLIC_PATHS}>
          {children}
        </RoleGuard>
      </main>

      <BottomNav
        items={[
          { href: '/client', label: 'Accueil', icon: 'home' },
          { href: '/client/demandes', label: 'Mes demandes', icon: 'briefcase' },
        ]}
        primaryHref={{ href: '/client/demande', label: 'Déposer une demande', icon: 'plus' }}
      />
    </div>
  );
}