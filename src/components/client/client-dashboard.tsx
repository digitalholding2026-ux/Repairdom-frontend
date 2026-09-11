'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Spinner } from '@/components/ui/spinner';
import { DemandeCard, HistoryDemandeCard } from '@/components/client/demande-card';
import { getMe, logout, homePathForRole } from '@/lib/api/auth-service';
import {
  listMyDemandes,
  listMyDemandeHistory,
  type DemandeListItem,
} from '@/lib/api/request-service';
import { formatRequestedTiming } from '@/lib/request-timing';
import { cn } from '@/lib/cn';
import { getClientFinanceSummary, type ClientFinanceSummary } from '@/lib/api/finance-service';
import { formatCurrency } from '@/lib/format';

export type ClientDashboardVariant = 'home' | 'list' | 'history';

const ACTIVE_STATUSES = ['SUBMITTED', 'PENDING', 'ACCEPTED', 'SCHEDULED', 'IN_PROGRESS'];

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
  const [firstName, setFirstName] = useState<string | null>(null);
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
        // Le filtrage actif/historique est réalisé côté backend :
        // GET /demandes (actives) et GET /demandes/my/history (terminées/annulées).
        const [missions, history] = await Promise.all([
          variant === 'history' ? Promise.resolve([]) : listMyDemandes(),
          variant === 'list' ? Promise.resolve([]) : listMyDemandeHistory(),
        ]);
        if (!cancelled) {
          setFirstName(me.firstName ?? null);
          setDemandes(missions);
          setHistorique(history);
        }
        // Solde de simulation (lecture seule, jamais recalculé côté UI).
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

  const activeCount = demandes.length;
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

  const recent = useMemo(
    () =>
      [...demandes]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3),
    [demandes],
  );

  const handleLogout = async () => {
    await logout();
    window.location.href = '/client/connexion';
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
        <PageHeader
          title={isHistory ? 'Historique' : 'Mes missions'}
          description={
            isHistory
              ? 'Vos interventions confirmées et annulées.'
              : 'Suivez vos demandes, devis et interventions en cours.'
          }
        />

        <MissionTabs current={isHistory ? 'history' : 'missions'} />

        {list.length === 0 ? (
          <EmptyState
            title={isHistory ? 'Votre historique est vide' : 'Aucune mission en cours'}
            description={
              isHistory
                ? 'Les interventions confirmées et annulées apparaîtront ici.'
                : 'Vous n’avez aucune demande en cours pour le moment.'
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

  return (
    <div className="space-y-6">
      <section className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Bonjour{firstName ? ` ${firstName}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground">Que souhaitez-vous faire aujourd’hui ?</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Déconnexion
        </Button>
      </section>

      <section>
        <Link href="/client/demande" className="block">
          <Button size="lg" className="w-full">
            <Icon name="plus" strokeWidth={2.2} />
            Déposer une panne
          </Button>
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <QuickStat icon="clock" label="En cours" value={activeCount} href="/client/demandes" />
        <QuickStat
          icon="check-circle"
          label="Terminées"
          value={doneCount}
          href="/client/demandes/historique"
        />
      </section>

      {balance ? (
        <section>
          <Link href="/client/solde" className="block">
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Solde disponible</p>
                  <p className="mt-0.5 text-2xl font-bold tracking-tight">
                    {formatCurrency(balance.balance, balance.currency)}
                  </p>
                  {balance.mode === 'SIMULATION' ? (
                    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-warning-ink">
                      <Icon name="sparkles" size="3.5" />
                      Simulation
                    </p>
                  ) : null}
                </div>
                <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
                  Voir le solde
                  <Icon name="chevron-right" size="sm" />
                </span>
              </CardContent>
            </Card>
          </Link>
        </section>
      ) : null}

      {currentMission ? (
        <section className="space-y-3">
          <SectionHeader title="Intervention en cours" />
          <Link href={`/client/demandes/${currentMission.id}`} className="block">
            <Card className="overflow-hidden transition-colors hover:bg-muted/50">
              <div className="border-t-2 border-primary">
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-mono text-sm font-semibold text-primary">
                      {currentMission.reference}
                    </span>
                    <Badge variant="outline">Suivre</Badge>
                  </div>
                  <p className="text-sm font-medium">{currentMission.categoryLabel}</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {currentMission.description}
                  </p>
                  <p className="text-xs font-medium text-foreground">
                    {currentMission.requestedMode === 'SCHEDULED' ? 'Intervention souhaitée' : 'Intervention'} :{' '}
                    {formatRequestedTiming(currentMission.requestedMode, currentMission.requestedAt)}
                  </p>
                </CardContent>
              </div>
            </Card>
          </Link>
        </section>
      ) : demandes.length === 0 ? (
        <EmptyState
          title="Vous n’avez encore aucune demande"
          description="Décrivez votre panne et nous trouvons le technicien adapté près de chez vous."
          action={
            <Link href="/client/demande">
              <Button>Déposer une panne</Button>
            </Link>
          }
        />
      ) : null}

      {recent.length > 0 ? (
        <section className="space-y-3">
          <SectionHeader
            title="Demandes récentes"
            action={
              <Link href="/client/demandes" className="text-sm font-medium text-primary hover:underline">
                Tout voir
              </Link>
            }
          />
          <div className="space-y-3">
            {recent.map((d) => (
              <Link key={d.id} href={`/client/demandes/${d.id}`} className="block">
                <DemandeCard demande={d} />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function QuickStat({
  icon,
  label,
  value,
  href,
}: {
  icon: 'clock' | 'check-circle';
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon name={icon} />
          </span>
          <div className="min-w-0">
            <p className="text-xl font-bold leading-none">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}