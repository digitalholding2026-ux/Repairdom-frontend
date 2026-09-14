'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon, type IconName } from '@/components/ui/icon';
import { SectionHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { TechnicianDemandeCard } from '@/components/technician/technician-demande-card';
import { AvailabilityCard } from '@/components/technician/dashboard/availability-card';
import { QuickActions } from '@/components/technician/dashboard/quick-actions';
import { TechnicianLiveMissionCard } from '@/components/technician/dashboard/live-mission-card';
import { InterventionsCard } from '@/components/technician/dashboard/interventions-card';
import { RevenueCard } from '@/components/technician/dashboard/revenue-card';
import { DaySummary } from '@/components/technician/dashboard/day-summary';
import { AccountSection } from '@/components/technician/dashboard/account-section';
import { DashboardSkeleton } from '@/components/technician/dashboard/dashboard-skeleton';
import {
  ActivityFeed,
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
    } catch (err) {
      setAvailabilityError(
        err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la disponibilité.',
      );
    } finally {
      setAvailabilityBusy(false);
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

  const activeCount = mine.filter((d) => ACTIVE_STATUSES.includes(d.status)).length;
  const doneCount = history.filter((d) => d.status === 'CONFIRMED').length;

  const completedToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return history.filter(
      (d) => d.status === 'CONFIRMED' && new Date(d.createdAt) >= today,
    ).length;
  }, [history]);

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
        currency: confirmed ? 'XAF' : undefined,
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

  return (
    <div className="space-y-6">
      {/* ── Hero: salut + stats inline ─────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              {greeting}{firstName ? `, ${firstName}` : ''} 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              {profile?.isAvailable
                ? 'Vous êtes en ligne. Les demandes de votre zone vous sont proposées.'
                : 'Activez votre disponibilité pour recevoir de nouvelles demandes.'}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <Icon name="logout" size="sm" />
            <span className="ml-1 hidden sm:inline">Déconnexion</span>
          </Button>
        </div>

        {/* Stats inline */}
        <div className="grid grid-cols-3 gap-2.5">
          <StatCard
            icon="search"
            label="Disponibles"
            value={available.length}
            href="#nouvelles-demandes"
          />
          <StatCard
            icon="truck"
            label="En cours"
            value={activeCount}
          />
          <StatCard
            icon="check-circle"
            label="Terminées"
            value={doneCount}
            href="/technicien/historique"
          />
        </div>
      </section>

      {/* ── Disponibilité ──────────────────────────────────────── */}
      <section id="disponibilite" className="scroll-mt-20">
        <AvailabilityCard
          isAvailable={profile?.isAvailable ?? false}
          busy={availabilityBusy}
          error={availabilityError}
          onToggle={() => void handleToggleAvailability()}
        />
      </section>

      {/* ── Revenus ────────────────────────────────────────────── */}
      <section>
        <RevenueCard finance={finance} completedToday={completedToday} />
      </section>

      {/* ── Quick actions (contextuelles, pas de doublon BottomNav) */}
      <section>
        <QuickActions />
      </section>

      {/* ── Ma journée ─────────────────────────────────────────── */}
      <DaySummary activeMissions={mine.filter((d) => ACTIVE_STATUSES.includes(d.status))} completedToday={completedToday} />

      {/* ── Intervention en cours ──────────────────────────────── */}
      {currentMission ? (
        <section className="space-y-3">
          <SectionHeader title="Intervention en cours" />
          <TechnicianLiveMissionCard mission={currentMission} />
        </section>
      ) : null}

      {/* ── Nouvelles demandes ─────────────────────────────────── */}
      <section id="nouvelles-demandes" className="space-y-3 scroll-mt-20">
        <SectionHeader
          title="Nouvelles demandes"
          action={
            <Badge variant={available.length > 0 ? 'info' : 'neutral'}>
              {available.length} disponible{available.length !== 1 ? 's' : ''}
            </Badge>
          }
        />
        {available.length === 0 ? (
          <EmptyState
            title="Aucune demande disponible"
            description="Il n'y a pas de demande correspondant à votre profil et votre zone pour le moment."
          />
        ) : (
          <div className="space-y-3">
            {available.map((d) => (
              <TechnicianDemandeCard
                key={d.id}
                demande={d}
                detailHref={`/technicien/demandes/${d.id}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Mes interventions ──────────────────────────────────── */}
      {mineList.length > 0 ? (
        <section className="space-y-3">
          <SectionHeader
            title="Mes interventions"
            action={
              <Badge variant="success">
                {mineList.length} intervention{mineList.length !== 1 ? 's' : ''}
              </Badge>
            }
          />
          <div className="space-y-3">
            {mineList.map((d) => (
              <TechnicianDemandeCard
                key={d.id}
                demande={d}
                detailHref={`/technicien/demandes/${d.id}`}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Activité récente ───────────────────────────────────── */}
      <section className="space-y-3">
        <SectionHeader title="Activité récente" />
        <ActivityFeed items={activities} />
      </section>

      {/* ── Gamification ───────────────────────────────────────── */}
      <InterventionsCard completedCount={doneCount} />

      {/* ── Mon compte ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionHeader title="Mon compte" />
        {profile ? <AccountSection profile={profile} /> : null}
      </section>
    </div>
  );
}
