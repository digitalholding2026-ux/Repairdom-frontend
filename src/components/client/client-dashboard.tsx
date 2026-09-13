'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon, type IconName } from '@/components/ui/icon';
import { SectionHeader } from '@/components/ui/page-header';
import { Spinner } from '@/components/ui/spinner';
import { DemandeCard, HistoryDemandeCard } from '@/components/client/demande-card';
import { BalanceCard } from '@/components/client/dashboard/balance-card';
import { QuickActions } from '@/components/client/dashboard/quick-actions';
import { LiveMissionCard } from '@/components/client/dashboard/live-mission-card';
import {
  ActivityFeed,
  type ActivityItem,
  type ActivityTone,
} from '@/components/client/dashboard/activity-feed';
import { RewardsCard } from '@/components/client/dashboard/rewards-card';
import { getMe, logoutAndGoHome, homePathForRole, type AuthUser } from '@/lib/api/auth-service';
import {
  listMyDemandes,
  listMyDemandeHistory,
  type DemandeListItem,
} from '@/lib/api/request-service';
import { demandeStatusConfig } from '@/lib/request-status';
import { cn } from '@/lib/cn';
import { getClientFinanceSummary, type ClientFinanceSummary } from '@/lib/api/finance-service';

export type ClientDashboardVariant = 'home' | 'list' | 'history';

const ACTIVE_STATUSES = ['SUBMITTED', 'PENDING', 'ACCEPTED', 'SCHEDULED', 'IN_PROGRESS'];

const STATUS_FEED_ICONS: Record<string, IconName> = {
  SUBMITTED: 'search',
  PENDING: 'clock',
  ACCEPTED: 'users',
  SCHEDULED: 'calendar',
  IN_PROGRESS: 'truck',
  COMPLETED: 'check-circle',
  CONFIRMED: 'badge-check',
  CANCELED: 'x',
};

const TX_STATUS_SHORT: Record<string, string> = {
  VALIDATED: 'Validé',
  PENDING: 'En attente',
  REVERSED: 'Annulé',
  FAILED: 'Échoué',
};

function MissionTabs({ current }: { current: 'missions' | 'history' }) {
  const tabs = [
    { id: 'missions', label: 'Mes missions', href: '/client/demandes' },
    { id: 'history', label: 'Historique', href: '/client/demandes/historique' },
  ] as const;
  return (
    <div
      className="flex items-center gap-2 overflow-x-auto no-scrollbar"
      role="tablist"
      aria-label="Mes missions et historique"
    >
      {tabs.map((tab) => {
        const active = tab.id === current;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            role="tab"
            aria-selected={active}
            className={cn(
              'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:opacity-90',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

export function ClientDashboard({ variant = 'home' }: { variant?: ClientDashboardVariant }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [demandes, setDemandes] = useState<DemandeListItem[]>([]);
  const [historique, setHistorique] = useState<DemandeListItem[]>([]);
  const [balance, setBalance] = useState<ClientFinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const me = await getMe();
        if (cancelled) return;
        if (me.role !== 'CLIENT') {
          router.replace(homePathForRole(me.role));
          return;
        }
        const [missions, history] = await Promise.all([
          variant === 'history' ? Promise.resolve([]) : listMyDemandes(),
          variant === 'list' ? Promise.resolve([]) : listMyDemandeHistory(),
        ]);
        if (!cancelled) {
          setUser(me);
          setDemandes(missions);
          setHistorique(history);
        }
        getClientFinanceSummary()
          .then((b) => {
            if (!cancelled) setBalance(b);
          })
          .catch(() => undefined);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur de chargement.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router, variant]);

  const doneCount = useMemo(
    () => historique.filter((d) => d.status === 'CONFIRMED').length,
    [historique],
  );

  const currentMission = useMemo(() => {
    const active = demandes
      .filter((d) => ACTIVE_STATUSES.includes(d.status))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return active[0] ?? null;
  }, [demandes]);

  const activities = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];

    for (const d of demandes) {
      const config = demandeStatusConfig(d.status, 'client');
      const tone: ActivityTone = d.status === 'IN_PROGRESS' ? 'primary' : 'info';
      items.push({
        id: `d-${d.id}`,
        icon: STATUS_FEED_ICONS[d.status] ?? 'wrench',
        tone,
        title: `Demande ${d.reference}`,
        subtitle: `${config.label} · ${d.categoryLabel}`,
        createdAt: d.createdAt,
        href: `/client/demandes/${d.id}`,
      });
    }

    for (const d of historique) {
      const config = demandeStatusConfig(d.status, 'history');
      items.push({
        id: `h-${d.id}`,
        icon: d.status === 'CONFIRMED' ? 'badge-check' : 'x',
        tone: d.status === 'CONFIRMED' ? 'success' : 'warning',
        title: `Mission ${d.reference}`,
        subtitle: `${config.label} · ${d.categoryLabel}`,
        createdAt: d.createdAt,
        href: '/client/demandes/historique',
      });
    }

    for (const t of balance?.transactions ?? []) {
      if (t.status === 'FAILED') continue;
      const credit = t.direction === 'CREDIT';
      items.push({
        id: `t-${t.id}`,
        icon: credit ? 'check-circle' : 'clock',
        tone: credit ? 'success' : 'info',
        title: credit ? 'Crédit reçu' : 'Paiement mission',
        subtitle: `${t.reference} · ${TX_STATUS_SHORT[t.status] ?? t.status}`,
        amount: credit ? t.amount : -t.amount,
        currency: balance?.currency,
        createdAt: t.createdAt,
      });
    }

    return items
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  }, [demandes, historique, balance]);

  const handleLogout = async () => {
    await logoutAndGoHome();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
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
    return (
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              {isHistory ? 'Historique' : 'Mes missions'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isHistory
                ? 'Vos interventions confirmées et annulées.'
                : 'Suivez vos demandes, devis et interventions en cours.'}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <Icon name="logout" size="sm" />
            <span className="ml-1 hidden sm:inline">Déconnexion</span>
          </Button>
        </div>

        <MissionTabs current={isHistory ? 'history' : 'missions'} />

        {list.length === 0 ? (
          <EmptyState
            title={isHistory ? 'Votre historique est vide' : 'Aucune mission en cours'}
            description={
              isHistory
                ? 'Les interventions confirmées et annulées apparaîtront ici.'
                : 'Vous n\u2019avez aucune demande en cours pour le moment.'
            }
            action={
              <Link href="/client/demande">
                <Button>Déposer une panne</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {list.map((d) => (
              <Link key={d.id} href={`/client/demandes/${d.id}`} className="block">
                {isHistory ? (
                  <HistoryDemandeCard demande={d} />
                ) : (
                  <DemandeCard demande={d} />
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  const firstName = user?.firstName ?? '';

  return (
    <div className="space-y-6">
      <section className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Bonjour{firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p className="text-sm text-muted-foreground">Que pouvons-nous réparer pour vous ?</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <Icon name="logout" size="sm" />
          <span className="ml-1 hidden sm:inline">Déconnexion</span>
        </Button>
      </section>

      {/* Niveau 1 — CTA principal (action immédiate dominante) */}
      <section>
        <Link href="/client/demande" className="block">
          <Button size="lg" className="w-full gap-2 text-base">
            <Icon name="wrench" size="md" strokeWidth={2} />
            J&apos;ai besoin d&apos;un dépannage
          </Button>
        </Link>
      </section>

      {/* Solde — carte dégradée façon Revolut */}
      {balance ? (
        <section>
          <BalanceCard balance={balance} />
        </section>
      ) : null}

      {/* Quick actions */}
      <QuickActions />

      {/* Intervention en cours — carte « live » animée */}
      {currentMission ? (
        <section className="space-y-3">
          <SectionHeader title="Intervention en cours" />
          <LiveMissionCard mission={currentMission} />
        </section>
      ) : demandes.length === 0 ? (
        <EmptyState
          title="Vous n\u2019avez encore aucune demande"
          description="Décrivez votre panne et nous trouvons le technicien adapté près de chez vous."
          action={
            <Link href="/client/demande">
              <Button>Déposer une panne</Button>
            </Link>
          }
        />
      ) : null}

      {/* Feed d'activité */}
      <section className="space-y-3">
        <SectionHeader title="Activité récente" />
        <ActivityFeed items={activities} />
      </section>

      {/* Gamification — récompenses */}
      <RewardsCard completedCount={doneCount} />

      {/* Mon compte */}
      <section className="space-y-3">
        <SectionHeader title="Mon compte" />
        <div className="space-y-2">
          <Link href="/client/profil" className="block">
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon name="user" />
                </span>
                <p className="text-sm font-semibold">Profil</p>
                <span className="ml-auto">
                  <Icon name="chevron-right" size="sm" className="text-muted-foreground" />
                </span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/conditions-utilisation" className="block">
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon name="file" />
                </span>
                <p className="text-sm font-semibold">Conditions d&apos;utilisation</p>
                <span className="ml-auto">
                  <Icon name="chevron-right" size="sm" className="text-muted-foreground" />
                </span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  );
}