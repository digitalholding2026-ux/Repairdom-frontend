'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Avatar } from '@/components/ui/avatar';
import { NotificationTabBadge } from '@/components/notifications/notification-tab-badge';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { categoryIcon, getGreeting, RecentStatusPill } from './client-home-blocks';
import type { ClientDashboardData } from './use-client-dashboard-data';

/* CHANTIER UI DESKTOP & MOBILE — accueil client GRAND ÉCRAN : composition
 * deux colonnes sur surfaces claires (contenu principal + panneau latéral
 * : solde, actions, récompenses). Mêmes données, mêmes libellés et mêmes
 * destinations que la vue mobile ; structure indépendante (isolation anti
 * cascade-régression). */
export function ClientHomeDesktopView({ data }: { data: ClientDashboardData }) {
  const { user, balance, showBalance, setShowBalance, recent } = data;
  const displayName = user?.firstName?.trim() ? user.firstName.trim() : 'Client';

  return (
    <div className="space-y-6">
      {/* ── En-tête desktop : salutation + actions regroupées ────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/client/profil" aria-label="Mon profil" className="shrink-0">
            <Avatar
              src={user?.avatarUrl}
              firstName={user?.firstName}
              lastName={user?.lastName}
              size="lg"
              alt="Photo de profil"
            />
          </Link>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{getGreeting()},</p>
            <h1 className="truncate text-2xl font-bold tracking-tight">{displayName}</h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/#faq">
            <Button variant="ghost">Support Relio</Button>
          </Link>
          <Link href="/client/notifications" aria-label="Notifications">
            <Button variant="outline" size="icon">
              <span className="relative flex items-center justify-center">
                <Icon name="bell" size="md" />
                <NotificationTabBadge />
              </span>
            </Button>
          </Link>
          <Link href="/client/demande">
            <Button>
              <Icon name="plus" size="sm" />
              Nouvelle demande
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* ── Colonne principale : dépannages récents ────────────── */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Dépannages récents</CardTitle>
              <Link
                href="/client/demandes"
                className="text-sm font-semibold text-relio-orange hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Voir tout →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm font-semibold">Aucun dépannage pour le moment</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Créez votre première demande en quelques étapes.
                </p>
                <Link href="/client/demande" className="mt-4 inline-block">
                  <Button>
                    <Icon name="plus" size="sm" />
                    Créer une demande
                  </Button>
                </Link>
              </div>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {recent.map((item) => (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                          <Icon name={categoryIcon(item.categoryLabel)} size="md" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">
                            {item.categoryLabel}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
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
          </CardContent>
        </Card>

        {/* ── Panneau latéral : solde + raccourcis ───────────────── */}
        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Mon solde</CardTitle>
                <button
                  type="button"
                  onClick={() => setShowBalance((v) => !v)}
                  aria-label={showBalance ? 'Masquer le solde' : 'Afficher le solde'}
                  aria-pressed={showBalance}
                  className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
                >
                  <Icon name="eye" size="md" className={showBalance ? undefined : 'opacity-40'} />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="figure text-3xl font-extrabold tabular-nums tracking-tight">
                {showBalance && balance
                  ? formatCurrency(balance.balance, balance.currency)
                  : '*** *** XAF'}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <span aria-hidden className="size-1.5 rounded-full bg-emerald-500" />
                Crédits actifs • Dépannages illimités
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link href="/client/solde">
                  <Button variant="secondary" className="w-full">
                    Gérer
                  </Button>
                </Link>
                <Link href="/client/solde/recharger">
                  <Button className="w-full">
                    Recharger
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Link href="/client/demande">
                <Button variant="outline" className="w-full justify-start">
                  <Icon name="plus" size="sm" />
                  Créer une demande
                </Button>
              </Link>
              <Link href="/client/demandes">
                <Button variant="outline" className="w-full justify-start">
                  <Icon name="search" size="sm" />
                  Mes dépannages
                </Button>
              </Link>
              <Link href="/client/recompenses">
                <Button variant="outline" className="w-full justify-start">
                  <Icon name="sparkles" size="sm" />
                  Récompenses et parrainage
                </Button>
              </Link>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
