'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon, type IconName } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { DashboardHero } from '@/components/ui/app-header';
import { DemandeCard, HistoryDemandeCard } from '@/components/client/demande-card';
import { ClientDashboardSkeleton } from '@/components/client/dashboard/client-dashboard-skeleton';
import { NotificationTabBadge } from '@/components/notifications/notification-tab-badge';
import { Avatar } from '@/components/ui/avatar';
import { getMe, logoutAndGoHome, homePathForRole, type AuthUser } from '@/lib/api/auth-service';
import {
  listMyDemandes,
  listMyDemandeHistory,
  type DemandeListItem,
} from '@/lib/api/request-service';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { getClientFinanceSummary, type ClientFinanceSummary } from '@/lib/api/finance-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';

export type ClientDashboardVariant = 'home' | 'list' | 'history';

const ACTIVE_STATUSES = ['SUBMITTED', 'PENDING', 'ACCEPTED', 'SCHEDULED', 'IN_PROGRESS'];

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

/* ── Accueil Neero-style : helpers ────────────────────────────── */

/** Icône du métier affichée sur fond ambre/orange léger. */
function categoryIcon(label: string): IconName {
  const l = label.toLowerCase();
  if (l.includes('elec')) return 'zap';
  if (l.includes('plomb') || l.includes('sanitaire') || l.includes('eau')) return 'droplet';
  if (l.includes('clim') || l.includes('froid') || l.includes('chauff') || l.includes('therm'))
    return 'thermometer';
  if (l.includes('info') || l.includes('ordi') || l.includes('télé') || l.includes('tele'))
    return 'cpu';
  return 'wrench';
}

/** Badge de statut pill : sémantique design system (warning/info/success/muted). */
function RecentStatusPill({ status }: { status: string }) {
  if (status === 'SUBMITTED' || status === 'PENDING') {
    return (
      <span className="shrink-0 rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning-ink">
        En attente
      </span>
    );
  }
  if (status === 'ACCEPTED' || status === 'SCHEDULED' || status === 'IN_PROGRESS') {
    return (
      <span className="shrink-0 rounded-full bg-info-soft px-3 py-1 text-xs font-semibold text-info-ink">
        En cours
      </span>
    );
  }
  if (status === 'COMPLETED' || status === 'CONFIRMED') {
    return (
      <span className="shrink-0 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success-ink">
        Terminé
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
      Annulée
    </span>
  );
}

interface RecentItem {
  key: string;
  id: string;
  categoryLabel: string;
  reference: string;
  status: string;
  createdAt: string;
  href: string;
}

function toRecentItem(d: DemandeListItem, kind: 'demande' | 'history'): RecentItem {
  return {
    key: `${kind}-${d.id}`,
    id: d.id,
    categoryLabel: d.categoryLabel,
    reference: d.reference,
    status: d.status,
    createdAt: d.createdAt,
    href: kind === 'demande' ? `/client/demandes/${d.id}` : '/client/demandes/historique',
  };
}

export function ClientDashboard({ variant = 'home' }: { variant?: ClientDashboardVariant }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [demandes, setDemandes] = useState<DemandeListItem[]>([]);
  const [historique, setHistorique] = useState<DemandeListItem[]>([]);
  const [balance, setBalance] = useState<ClientFinanceSummary | null>(null);
  const [showBalance, setShowBalance] = useState(false);
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
        if (!cancelled) setError(toUserErrorMessage(err, 'Erreur de chargement.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router, variant]);

  const recent = useMemo<RecentItem[]>(() => {
    const all: RecentItem[] = [
      ...demandes.map((d) => toRecentItem(d, 'demande')),
      ...historique.map((d) => toRecentItem(d, 'history')),
    ];
    return all
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [demandes, historique]);

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

  const displayName = user?.firstName?.trim() ? user.firstName.trim() : 'Client';

  return (
    <div className="min-h-dvh bg-slate-100 pb-28 dark:bg-slate-950">
      {/* ── Header sombre + carte solde (Neero style) ──────────── */}
      <header className="relative overflow-hidden rounded-b-[32px] bg-slate-950 p-6 pb-12 text-white shadow-lg">
        <div
          aria-hidden
                className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-relio-orange/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 bottom-0 size-56 rounded-full bg-orange-400/10 blur-3xl"
        />
        <div className="relative">
          {/* Top bar : avatar + salutation | support + notifications */}
          <div className="flex items-center justify-between gap-3">
            <Link href="/client/profil" className="flex min-w-0 items-center gap-3" aria-label="Mon profil">
              <Avatar
                src={user?.avatarUrl}
                firstName={user?.firstName}
                lastName={user?.lastName}
                size="md"
                alt="Photo de profil"
                className="rounded-full shadow-lg shadow-orange-500/30 ring-2 ring-orange-500/70"
              />
              <span className="min-w-0">
                <span className="block text-xs text-white/60">{getGreeting()},</span>
                <span className="block truncate text-base font-bold leading-tight">
                  {displayName} 👋
                </span>
              </span>
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/#faq"
                className="rounded-full bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                Support Relio
              </Link>
              <Link
                href="/client/notifications"
                aria-label="Notifications"
                className="relative flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 active:scale-95"
              >
                <Icon name="bell" size="md" strokeWidth={1.8} />
                <NotificationTabBadge />
              </Link>
            </div>
          </div>

          {/* Carte solde suspendue */}
          <div className="relative z-10 mx-auto -mb-16 mt-6 max-w-md rounded-2xl border border-slate-100 bg-white p-6 text-slate-900 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Compte Client Relio
              </p>
              <button
                type="button"
                onClick={() => setShowBalance((v) => !v)}
                aria-label={showBalance ? 'Masquer le solde' : 'Afficher le solde'}
                aria-pressed={showBalance}
                className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 active:scale-95"
              >
                <Icon name="eye" size="md" className={showBalance ? undefined : 'opacity-40'} />
              </button>
            </div>
            <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight">
              {showBalance && balance ? formatCurrency(balance.balance, balance.currency) : '*** *** XAF'}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <span aria-hidden className="size-1.5 rounded-full bg-emerald-500" />
              Crédits actifs • Dépannages illimités
            </p>
            <Link
              href="/client/solde"
              className="mt-4 flex items-center justify-between rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              Gérer mon solde
              <Icon name="arrow-right" size="sm" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Actions rapides : 3 boutons circulaires ─────────────── */}
      <section aria-label="Actions rapides" className="mx-auto grid max-w-md grid-cols-3 gap-2 px-6 pt-20">
        <Link href="/client/demande" className="group flex flex-col items-center gap-2">
          <span className="flex size-14 items-center justify-center rounded-full bg-orange-500/90 text-white shadow-lg shadow-orange-500/20 backdrop-blur-sm transition group-hover:scale-105 group-active:scale-95 group-hover:bg-orange-500">
            <Icon name="plus" size="lg" strokeWidth={2.2} />
          </span>
          <span className="text-center text-xs font-semibold leading-tight text-slate-700 dark:text-slate-200">
            Créer une demande
          </span>
        </Link>
        <Link href="/client/solde/recharger" className="group flex flex-col items-center gap-2">
          <span className="flex size-14 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-200 shadow-lg transition group-hover:scale-105 group-active:scale-95">
            <Icon name="wallet" size="lg" strokeWidth={1.9} />
          </span>
          <span className="text-center text-xs font-semibold leading-tight text-slate-700 dark:text-slate-200">
            Recharger solde
          </span>
        </Link>
        <Link href="/client/demandes" className="group flex flex-col items-center gap-2">
          <span className="flex size-14 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-200 shadow-lg transition group-hover:scale-105 group-active:scale-95">
            <Icon name="search" size="lg" strokeWidth={1.9} />
          </span>
          <span className="text-center text-xs font-semibold leading-tight text-slate-700 dark:text-slate-200">
            Mes dépannages
          </span>
        </Link>
      </section>

      {/* ── Dépannages récents ──────────────────────────────────── */}
      <section aria-label="Dépannages récents" className="mx-auto mt-6 max-w-md px-4">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
            Dépannages récents
          </h2>
          <Link
            href="/client/demandes"
            className="text-sm font-semibold text-relio-orange hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Voir tout →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Aucun dépannage pour le moment</p>
            <p className="mt-1 text-xs text-slate-500">
              Créez votre première demande en quelques étapes.
            </p>
            <Link
              href="/client/demande"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-orange-500/90 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 backdrop-blur-sm transition hover:bg-orange-500 active:scale-95"
            >
              <Icon name="plus" size="sm" />
              Créer une demande
            </Link>
          </div>
        ) : (
          <ul>
            {recent.map((item) => (
              <li key={item.key} className="mb-3">
                <Link
                  href={item.href}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                      <Icon name={categoryIcon(item.categoryLabel)} size="md" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900">
                        {item.categoryLabel}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {item.reference} • {formatDateTime(item.createdAt)}
                      </span>
                    </span>
                  </span>
                  <RecentStatusPill status={item.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
