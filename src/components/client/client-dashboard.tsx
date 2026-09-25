'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon, type IconName } from '@/components/ui/icon';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { DashboardHero } from '@/components/ui/app-header';
import { GradientHeroCard } from '@/components/ui/gradient-hero-card';
import { DemandeStatusBadge } from '@/components/ui/status-badge';
import { DemandeCard, HistoryDemandeCard } from '@/components/client/demande-card';
import { LiveMissionCard } from '@/components/client/dashboard/live-mission-card';
import { RewardsCard } from '@/components/client/dashboard/rewards-card';
import { ClientDashboardSkeleton } from '@/components/client/dashboard/client-dashboard-skeleton';
import {
  ActivityFeed,
  type ActivityItem,
  type ActivityTone,
} from '@/components/client/dashboard/activity-feed';
import { getMe, logoutAndGoHome, homePathForRole, type AuthUser } from '@/lib/api/auth-service';
import {
  listMyDemandes,
  listMyDemandeHistory,
  type DemandeListItem,
} from '@/lib/api/request-service';
import { formatCurrency } from '@/lib/format';
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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

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

const REASSURANCE_CARDS: Array<{ icon: IconName; title: string; text: string }> = [
  {
    icon: 'shield-check',
    title: 'Techniciens vérifiés',
    text: 'Identité et qualifications contrôlées par l\u2019équipe Relio avant chaque intervention.',
  },
  {
    icon: 'wallet',
    title: 'Paiement sécurisé',
    text: 'Votre solde n\u2019est débité qu\u2019après confirmation de l\u2019opérateur Mobile Money.',
  },
  {
    icon: 'clock',
    title: 'Intervention rapide',
    text: 'Un technicien disponible près de chez vous, au créneau qui vous convient.',
  },
];

/* État vide animé de « Mes missions » + cartes de réassurance. */
function MissionsEmptyState() {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/10">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-2xl bg-slate-300/40 opacity-75 dark:bg-white/10" />
        <Icon name="wrench" size="xl" className="relative z-10 h-10 w-10 text-slate-500 dark:text-slate-300" />
      </div>
      <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
        Aucune intervention en cours
      </h3>
      <p className="mb-6 max-w-md text-sm text-slate-500 dark:text-slate-400">
        Besoin d&apos;un électricien, plombier ou réparateur ? Décrivez votre problème et
        recevez des propositions de nos techniciens vérifiés.
      </p>
      <Link href="/client/demande">
        <Button
          size="lg"
          className="shadow-lg shadow-primary/25 transition-all duration-200 hover:scale-[1.02] hover:shadow-primary/40 active:scale-[0.98]"
        >
          <Icon name="plus" size="sm" />
          Demander un dépannage
        </Button>
      </Link>
      <div className="mt-8 grid w-full grid-cols-1 gap-4 border-t border-slate-100 pt-8 dark:border-slate-800/60 md:grid-cols-3">
        {REASSURANCE_CARDS.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-slate-200/50 bg-slate-50/80 p-4 text-left dark:border-slate-700/40 dark:bg-slate-800/40"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
              <Icon name={card.icon} size="md" />
            </span>
            <p className="mt-3 text-sm font-semibold">{card.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{card.text}</p>
          </div>
        ))}
      </div>
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
      const tone: ActivityTone = d.status === 'IN_PROGRESS' ? 'primary' : 'info';
      items.push({
        id: `d-${d.id}`,
        icon: STATUS_FEED_ICONS[d.status] ?? 'wrench',
        tone,
        title: `Demande ${d.reference}`,
        subtitle: d.categoryLabel,
        badge: <DemandeStatusBadge status={d.status} context="client" className="shrink-0" />,
        createdAt: d.createdAt,
        href: `/client/demandes/${d.id}`,
      });
    }

    for (const d of historique) {
      items.push({
        id: `h-${d.id}`,
        icon: d.status === 'CONFIRMED' ? 'badge-check' : 'x',
        tone: d.status === 'CONFIRMED' ? 'success' : 'warning',
        title: `Mission ${d.reference}`,
        subtitle: d.categoryLabel,
        badge: <DemandeStatusBadge status={d.status} context="history" className="shrink-0" />,
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
            onLogout={handleLogout}
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

  const firstName = user?.firstName ?? '';
  // Fonds engagés (holds ACTIFS) = brut validé − disponible.
  const engaged = balance
    ? Math.max(0, balance.totals.credit - balance.totals.debit - balance.balance)
    : 0;
  // L'état vide ne s'affiche que sans demande ET sans activité récente.
  const isEmpty = demandes.length === 0 && activities.length === 0;

  return (
    <div className="space-y-6">
      {/* ── En-tête ──────────────────────────────────────────── */}
      <PageHeader
        title={
          <>
            {getGreeting()}
            {firstName ? `, ${firstName}` : ''} 👋
          </>
        }
        description="Ravi de vous revoir. Gérez vos dépannages et votre solde en toute simplicité."
      />

      {/* ── Grille principale : Solde + Fidélité ─────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {balance ? (
          <GradientHeroCard tone="primary">
            <p className="text-xs font-medium uppercase tracking-wider text-white/70">
              Solde disponible
            </p>
            <p className="figure mt-1 text-3xl font-bold tabular-nums text-white">
              {formatCurrency(balance.balance, balance.currency)}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/80">
              <span>Crédits reçus · {formatCurrency(balance.totals.credit, balance.currency)}</span>
              <span>Engagé · {formatCurrency(engaged, balance.currency)}</span>
            </div>
            <Link href="/client/solde" className="mt-4 block">
              <Button variant="outline" size="sm" className="w-full">
                Gérer mon solde
                <Icon name="arrow-right" size="sm" />
              </Button>
            </Link>
          </GradientHeroCard>
        ) : null}

        <RewardsCard completedCount={doneCount} />
      </div>

      {/* ── Bannière d'action rapide ─────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">
          Une panne à la maison ou au bureau ?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Décrivez votre panne en quelques étapes et recevez l&apos;aide d&apos;un technicien vérifié près de chez vous.
        </p>
        <Link href="/client/demande" className="mt-4 block">
          <Button className="w-full gap-2 sm:w-auto">
            <Icon name="plus" size="sm" />
            Créer une demande de dépannage
          </Button>
        </Link>
      </section>

      {/* ── Intervention en cours ────────────────────────────── */}
      {currentMission ? (
        <section className="space-y-3">
          <SectionHeader title="Intervention en cours" />
          <LiveMissionCard mission={currentMission} />
        </section>
      ) : null}

      {/* ── Activité récente ─────────────────────────────────── */}
      <section className="space-y-3">
        <SectionHeader
          title="Activité récente"
          icon="clock"
          action={
            <Link
              href="/client/demandes"
              className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Tout voir
            </Link>
          }
        />
        {isEmpty ? (
          <EmptyState
            title="Aucune demande pour le moment"
            description="Vous n'avez pas encore créé de demande de dépannage."
            action={
              <Link href="/client/demande">
                <Button>Créer une demande</Button>
              </Link>
            }
          />
        ) : (
          <ActivityFeed items={activities} />
        )}
      </section>
    </div>
  );
}
