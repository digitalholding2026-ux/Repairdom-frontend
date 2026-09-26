'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon, type IconName } from '@/components/ui/icon';
import { InterventionsCard } from '@/components/technician/dashboard/interventions-card';
import { DashboardSkeleton } from '@/components/technician/dashboard/dashboard-skeleton';
import {
  TechAccountRow,
  TechActivityCard,
  TechKpiCard,
  TechMissionRow,
  TechRadarCard,
  TechStatusCard,
} from '@/components/technician/dashboard/tech-overview';
import {
  type ActivityItem,
  type ActivityTone,
} from '@/components/client/dashboard/activity-feed';
import { getMe, logoutAndGoHome } from '@/lib/api/auth-service';
import {
  listAvailableDemandes,
  listMyDemandes,
  listMyDemandeHistory,
  getTechnicianProfile,
  updateTechnicianAvailability,
  type TechnicianDemande,
  type TechnicianProfile,
} from '@/lib/api/technician-service';
import { getTechnicianFinanceSummary, type TechnicianFinanceSummary } from '@/lib/api/finance-service';
import { demandeStatusConfig } from '@/lib/request-status';
import { formatCurrency, fullName } from '@/lib/format';

const ACTIVE_STATUSES = ['ACCEPTED', 'SCHEDULED', 'IN_PROGRESS'];

const STATUS_FEED_ICONS: Record<string, IconName> = {
  ACCEPTED: 'users',
  SCHEDULED: 'calendar',
  IN_PROGRESS: 'truck',
  COMPLETED: 'check-circle',
  CONFIRMED: 'badge-check',
  CANCELED: 'x',
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

export default function TechnicianDashboardPage() {
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [available, setAvailable] = useState<TechnicianDemande[]>([]);
  const [mine, setMine] = useState<TechnicianDemande[]>([]);
  const [history, setHistory] = useState<TechnicianDemande[]>([]);
  const [finance, setFinance] = useState<TechnicianFinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const me = await getMe();
        if (cancelled) return;
        if (me.role !== 'TECHNICIAN') {
          setError('Votre compte n\'est pas un compte technicien.');
          setLoading(false);
          return;
        }
        const [profileData, availableList, myList, historyList] = await Promise.all([
          getTechnicianProfile(),
          listAvailableDemandes(),
          listMyDemandes(),
          listMyDemandeHistory(),
        ]);
        if (!cancelled) {
          setProfile(profileData);
          setAvailable(availableList);
          setMine(myList);
          setHistory(historyList);
        }
        getTechnicianFinanceSummary()
          .then((f) => { if (!cancelled) setFinance(f); })
          .catch(() => undefined);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur de chargement.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const handleLogout = async () => {
    await logoutAndGoHome();
  };

  const handleToggleAvailability = async () => {
    if (!profile) return;
    setAvailabilityBusy(true);
    setAvailabilityError(null);
    try {
      const updated = await updateTechnicianAvailability(!profile.isAvailable);
      setProfile(updated);
      // La disponibilité conditionne l’éligibilité dispatch : recharger les
      // missions proposées pour garder le compteur cohérent.
      setAvailable(await listAvailableDemandes());
    } catch (err) {
      setAvailabilityError(
        err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la disponibilité.',
      );
    } finally {
      setAvailabilityBusy(false);
    }
  };

  const refreshAvailable = async () => {
    setRefreshing(true);
    try {
      setAvailable(await listAvailableDemandes());
    } catch {
      /* Le radar garde les dernières données en cas d'échec réseau. */
    } finally {
      setRefreshing(false);
    }
  };

  const currentMission = useMemo(() => {
    const active = mine
      .filter((d) => ACTIVE_STATUSES.includes(d.status))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return active[0] ?? null;
  }, [mine]);

  const mineList = useMemo(
    () => mine.filter((d) => !currentMission || d.id !== currentMission.id),
    [mine, currentMission],
  );

  const todayRange = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }, []);

  const completedToday = useMemo(() => {
    return history.filter(
      (d) => d.status === 'CONFIRMED' && new Date(d.createdAt) >= todayRange,
    ).length;
  }, [history, todayRange]);

  const todayRevenue = useMemo(() => {
    return history
      .filter((d) => d.status === 'CONFIRMED' && new Date(d.createdAt) >= todayRange)
      .reduce((sum, d) => sum + (d.finalAmount ?? 0), 0);
  }, [history, todayRange]);

  const activities = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];

    for (const d of mine) {
      const config = demandeStatusConfig(d.status, 'technician');
      const tone: ActivityTone = d.status === 'IN_PROGRESS' ? 'primary' : 'info';
      items.push({
        id: `d-${d.id}`,
        icon: STATUS_FEED_ICONS[d.status] ?? 'wrench',
        tone,
        title: `Mission ${d.reference}`,
        subtitle: `${config.label} · ${d.categoryLabel}`,
        createdAt: d.createdAt,
        href: `/technicien/demandes/${d.id}`,
      });
    }

    for (const d of history) {
      const confirmed = d.status === 'CONFIRMED';
      items.push({
        id: `h-${d.id}`,
        icon: confirmed ? 'badge-check' : 'x',
        tone: confirmed ? 'success' : 'warning',
        title: confirmed ? 'Intervention terminée' : 'Mission annulée',
        subtitle: `${d.reference} · ${d.categoryLabel}`,
        amount: confirmed ? (d.finalAmount ?? undefined) : undefined,
        currency: confirmed ? 'FCFA' : undefined,
        createdAt: d.createdAt,
        href: '/technicien/historique',
      });
    }

    return items
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  }, [mine, history]);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <EmptyState
        title="Accès requis"
        description={error}
        action={
          <Link href="/technicien/connexion">
            <Button>Se connecter en tant que technicien</Button>
          </Link>
        }
      />
    );
  }

  const firstName = profile?.user.firstName ?? null;
  const greeting = getGreeting();
  const zone = profile?.city?.trim() || 'votre zone';
  const verified = profile?.kycStatus === 'VERIFIED';
  const interventions = profile?.completedInterventions ?? history.filter((d) => d.status === 'CONFIRMED').length;
  const clientName = currentMission?.client
    ? fullName(currentMission.client.firstName, currentMission.client.lastName)
    : null;

  return (
    <div className="flex min-h-screen flex-col gap-6 rounded-3xl bg-[#0B0D12] p-4 text-slate-100 sm:p-6">
      {/* ── Header contenu : salutation + statut + déconnexion ── */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Espace technicien
          </p>
          <h1 className="mt-1 break-words text-xl font-bold tracking-tight text-white sm:text-2xl">
            {greeting}{firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={verified ? 'success' : 'warning'} className="gap-1">
              <Icon name={verified ? 'shield-check' : 'alert'} size="3.5" />
              {verified ? 'Technicien Vérifié' : 'Vérification en cours'}
            </Badge>
            <Badge variant="neutral" className="gap-1 border-white/10 bg-white/5 text-slate-300">
              <Icon name="pin" size="3.5" />
              {zone}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="shrink-0 border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
        >
          <Icon name="logout" size="sm" />
          <span className="ml-1 hidden sm:inline">Déconnexion</span>
        </Button>
      </header>

      {/* ── A + B : statut + KPIs ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="md:col-span-2 lg:col-span-1">
          <TechStatusCard
            isAvailable={profile?.isAvailable ?? false}
            busy={availabilityBusy}
            error={availabilityError}
            zone={zone}
            onToggle={() => void handleToggleAvailability()}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6 md:col-span-2 lg:col-span-2 lg:grid-cols-3">
          <TechKpiCard
            icon="briefcase"
            label="Revenus du jour"
            value={formatCurrency(todayRevenue, finance?.currency ?? 'XAF')}
            sub={`${completedToday} dépannage${completedToday !== 1 ? 's' : ''} aujourd'hui`}
            href="/technicien/revenus"
            accent="emerald"
          />
          <TechKpiCard
            icon="wrench"
            label="Interventions"
            value={`${interventions} / 10`}
            sub="Palier 1 · dépannages réalisés"
            href="/technicien/historique"
            accent="orange"
          />
          <TechKpiCard
            icon="star"
            label="Note & Avis"
            value="–"
            sub="Aucun avis client pour le moment"
            accent="amber"
          />
        </div>
      </div>

      {/* ── Intervention en cours (bandeau prioritaire) ───────── */}
      {currentMission ? (
        <Link
          href={`/technicien/demandes/${currentMission.id}`}
          className="block rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-500/20 via-orange-500/10 to-transparent p-4 transition-colors hover:border-orange-500/50 sm:p-5"
        >
          <div className="flex items-center gap-3">
            <span className="relative flex size-3 shrink-0" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-orange-400" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-orange-300">
                Intervention en cours
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-white">
                {currentMission.reference} · {currentMission.categoryLabel}
                {clientName ? ` · ${clientName}` : ''}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-orange-200">
              Reprendre
              <Icon name="chevron-right" size="sm" />
            </span>
          </div>
        </Link>
      ) : null}

      {/* ── C : radar live ────────────────────────────────────── */}
      <TechRadarCard
        zone={zone}
        missions={available.slice(0, 3)}
        total={available.length}
        refreshing={refreshing}
        onRefresh={() => void refreshAvailable()}
      />

      {/* ── D : activité + progression ────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TechActivityCard items={activities} />
        </div>
        <div>
          <InterventionsCard completedCount={interventions} />
        </div>
      </div>

      {/* ── Mes interventions ─────────────────────────────────── */}
      {mineList.length > 0 ? (
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
              <Icon name="briefcase" size="sm" className="text-orange-400" />
              Mes interventions
            </h2>
            <Badge variant="success" className="shrink-0">
              {mineList.length} intervention{mineList.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            {mineList.map((d) => (
              <TechMissionRow key={d.id} demande={d} />
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Mon compte ────────────────────────────────────────── */}
      {profile ? <TechAccountRow profile={profile} /> : null}

      {/* Espace de respiration au-dessus de la navigation basse mobile */}
      <div aria-hidden className="lg:hidden" />
    </div>
  );
}
