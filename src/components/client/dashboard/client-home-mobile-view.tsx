'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { Avatar } from '@/components/ui/avatar';
import { NotificationTabBadge } from '@/components/notifications/notification-tab-badge';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { categoryIcon, getGreeting, RecentStatusPill } from './client-home-blocks';
import { LiveMissionCard } from './live-mission-card';
import { AnimateOnScroll } from '@/components/landing/animate-on-scroll';
import type { ClientDashboardData } from './use-client-dashboard-data';

/* CHANTIER UI DESKTOP & MOBILE — accueil client TACTILE (téléphone) :
 * hero sombre Neero, actions circulaires, contenu empilé (action →
 * statut → essentiel → secondaire). Mêmes données, mêmes libellés et
 * mêmes destinations que la vue desktop ; seule la présentation diverge
 * (isolation anti cascade-régression). */
export function ClientHomeMobileView({ data }: { data: ClientDashboardData }) {
  const { user, balance, showBalance, setShowBalance, recent } = data;
  const displayName = user?.firstName?.trim() ? user.firstName.trim() : 'Client';

  return (
    <div className="min-h-dvh bg-slate-100 pb-28 dark:bg-relio-bg">
      {/* ── Header sombre + carte solde (Neero style) ──────────── */}
      <header className="relative overflow-hidden rounded-b-[32px] bg-relio-bg p-6 pb-12 text-white shadow-lg">
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
              className="mt-4 flex items-center justify-between rounded-xl bg-relio-bg px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              Gérer mon solde
              <Icon name="arrow-right" size="sm" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Intervention en cours ─────────────────────────────────
          AVANT les actions rapides, comme sur le bureau et comme chez le
          technicien : une intervention vivante prime sur un raccourci de
          navigation. Elle était noyée dans « Dépannages récents », au même
          rang qu'une intervention terminée la veille.
          La carte de solde reste au-dessus : le solde est l'information la
          plus consultée tous les jours, l'urgence une fois par
          intervention. */}
      {data.activeMission ? (
        <section aria-label="Intervention en cours" className="mx-auto mt-6 max-w-md px-4">
        <AnimateOnScroll delay={0}>
          <LiveMissionCard mission={data.activeMission} />
        </AnimateOnScroll>
        </section>
      ) : null}

      {/* ── Actions rapides : 3 boutons circulaires ─────────────── */}
      <section aria-label="Actions rapides" className="mx-auto grid max-w-md grid-cols-3 gap-2 px-6 pt-20">
        <AnimateOnScroll delay={80}>
          <Link href='/demande' className="group flex flex-col items-center gap-2">
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
        </AnimateOnScroll>
      </section>

      {/* ── Dépannages récents ──────────────────────────────────── */}
      <section aria-label="Dépannages récents" className="mx-auto mt-6 max-w-md px-4">
        <AnimateOnScroll delay={160} className="block">
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
              href='/demande'
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
              </AnimateOnScroll>
      </section>
    </div>
  );
}
