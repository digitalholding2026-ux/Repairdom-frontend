'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { DashboardHero } from '@/components/ui/app-header';
import { DemandeCard, HistoryDemandeCard } from '@/components/client/demande-card';
import { ClientDashboardSkeleton } from '@/components/client/dashboard/client-dashboard-skeleton';
import { ResponsiveView } from '@/components/ui/responsive-view';
import { ClientHomeDesktopView } from '@/components/client/dashboard/client-home-desktop-view';
import { ClientHomeMobileView } from '@/components/client/dashboard/client-home-mobile-view';
import { MissionsEmptyState } from '@/components/client/dashboard/client-home-blocks';
import {
  useClientDashboardData,
  type RecentItem,
} from '@/components/client/dashboard/use-client-dashboard-data';

export type ClientDashboardVariant = 'home' | 'list' | 'history';

/* Re-export partagé (isolation desktop/mobile : les vues consomment le
 * même type sans dupliquer la logique). */
export type { RecentItem };

const ACTIVE_STATUSES = ['SUBMITTED', 'PENDING', 'ACCEPTED', 'SCHEDULED', 'IN_PROGRESS'];

function MissionTabs({ current }: { current: 'missions' | 'history' }) {
  const items = [
    { id: 'missions', label: 'Mes missions', href: '/client/demandes' },
    { id: 'history', label: 'Historique', href: '/client/demandes/historique' },
  ];
  return (
    <nav
      aria-label="Mes missions et historique"
      className="inline-flex gap-1 rounded-xl border border-slate-200/50 bg-slate-100 p-1 dark:border-slate-700/50 dark:bg-slate-800/80"
    >
      {items.map((item) => {
        const active = item.id === current;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-xs transition-all duration-200 dark:bg-slate-900 dark:text-white'
                : 'rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:text-foreground'
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/* CHANTIER UI DESKTOP & MOBILE — mêmes données (`useClientDashboardData`),
 * mêmes règles, mêmes destinations. L'accueil (`home`) bascule entre deux
 * compositions structurellement indépendantes (`ResponsiveView` : une
 * seule montée, fallback SSR sans flash) ; les vues liste/historique
 * restent partagées (grilles responsives suffisantes). */
export function ClientDashboard({ variant = 'home' }: { variant?: ClientDashboardVariant }) {
  const data = useClientDashboardData(variant);
  const { demandes, historique, loading, error } = data;

  if (loading) {
    return <ClientDashboardSkeleton />;
  }

  if (error) {
    return (
      <EmptyState
        title="Accès requis"
        description={error}
        action={
          <Link href="/client/connexion">
            <Button>Se connecter en tant que client</Button>
          </Link>
        }
      />
    );
  }

  if (variant === 'list' || variant === 'history') {
    const isHistory = variant === 'history';
    const list = isHistory ? historique : demandes;
    const activeMissionsCount = demandes.filter((d) => ACTIVE_STATUSES.includes(d.status)).length;
    return (
      <div className="space-y-5">
        {isHistory ? (
          <DashboardHero
            title="Historique"
            subtitle="Vos interventions confirmées et annulées."
            onLogout={data.handleLogout}
          />
        ) : (
          <PageHeader
            title="Mes missions"
            description="Suivez vos demandes, devis et interventions en cours."
            actions={
              <Badge variant="outline">
                {activeMissionsCount} active{activeMissionsCount !== 1 ? 's' : ''}
              </Badge>
            }
          />
        )}

        <MissionTabs current={isHistory ? 'history' : 'missions'} />

        {isHistory ? (
          list.length === 0 ? (
            <EmptyState
              title="Votre historique est vide"
              description="Les interventions confirmées et annulées apparaîtront ici."
              action={
                <Link href="/client/demande">
                  <Button>Déposer une panne</Button>
                </Link>
              }
            />
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {list.map((d) => (
                <Link key={d.id} href={`/client/demandes/${d.id}`} className="block">
                  <HistoryDemandeCard demande={d} />
                </Link>
              ))}
            </div>
          )
        ) : (
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-relio-card">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gradient-to-br from-relio-orange/10 via-relio-orange-bright/10 to-transparent blur-3xl"
            />
            <div className="relative">
              {list.length === 0 ? (
                <MissionsEmptyState />
              ) : (
                <div className="grid gap-3 xl:grid-cols-2">
                  {list.map((d) => (
                    <Link key={d.id} href={`/client/demandes/${d.id}`} className="block">
                      <DemandeCard demande={d} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <ResponsiveView
      mobile={<ClientHomeMobileView data={data} />}
      desktop={<ClientHomeDesktopView data={data} />}
      fallback={<ClientDashboardSkeleton />}
    />
  );
}
