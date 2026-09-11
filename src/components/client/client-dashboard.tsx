'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { SectionHeader } from '@/components/ui/page-header';
import { Spinner } from '@/components/ui/spinner';
import { DemandeCard, HistoryDemandeCard } from '@/components/client/demande-card';
import { getMe, logout, homePathForRole, type AuthUser } from '@/lib/api/auth-service';
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

      {/* Solde */}
      {balance ? (
        <section>
          <Link href="/client/solde" className="block">
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="space-y-3 py-5">
                <div className="flex items-start justify-between gap-3">
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
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="pointer-events-none flex-1 opacity-60" tabIndex={-1}>
                    <Icon name="plus" size="sm" />
                    Recharger
                  </Button>
                  <Button variant="secondary" size="sm" className="pointer-events-none flex-1 opacity-60" tabIndex={-1}>
                    Retirer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        </section>
      ) : null}

      {/* Niveau 2 — Interventions en cours */}
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
                    {currentMission.requestedMode === 'SCHEDULED' ? 'Intervention souhaitée' : 'Intervention'}:{' '}
                    {formatRequestedTiming(currentMission.requestedMode, currentMission.requestedAt)}
                  </p>
                </CardContent>
              </div>
            </Card>
          </Link>
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

      {/* Résumé rapide : missions + historique */}
      <section className="grid grid-cols-2 gap-3">
        <Link href="/client/demandes" className="block">
          <Card className="transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon name="clock" />
              </span>
              <div className="min-w-0">
                <p className="text-xl font-bold leading-none">{activeCount}</p>
                <p className="mt-1 text-xs text-muted-foreground">En cours</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/client/demandes/historique" className="block">
          <Card className="transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon name="check-circle" />
              </span>
              <div className="min-w-0">
                <p className="text-xl font-bold leading-none">{doneCount}</p>
                <p className="mt-1 text-xs text-muted-foreground">Terminées</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>

      {/* Niveau 3 — Avantages */}
      <section className="space-y-3">
        <SectionHeader title="Mes avantages" />
        <div className="grid grid-cols-2 gap-3">
          <Link href="/client/parrainage" className="block">
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon name="users" />
                </span>
                <p className="text-sm font-semibold">Parrainage</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/client/recompenses" className="block">
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon name="sparkles" />
                </span>
                <p className="text-sm font-semibold">Récompenses</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      {/* Niveau 4 — Mon compte */}
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