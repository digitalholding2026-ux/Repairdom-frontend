'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon, type IconName } from '@/components/ui/icon';
import { SectionHeader } from '@/components/ui/page-header';
import { Skeleton, SkeletonCard, SkeletonRow } from '@/components/ui/skeleton';
import { TechnicianDemandeCard } from '@/components/technician/technician-demande-card';
import { AvailabilityCard } from '@/components/technician/dashboard/availability-card';
import { QuickActions } from '@/components/technician/dashboard/quick-actions';
import { TechnicianLiveMissionCard } from '@/components/technician/dashboard/live-mission-card';
import { InterventionsCard } from '@/components/technician/dashboard/interventions-card';
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

export default function TechnicianDashboardPage() {
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [available, setAvailable] = useState<TechnicianDemande[]>([]);
  const [mine, setMine] = useState<TechnicianDemande[]>([]);
  const [history, setHistory] = useState<TechnicianDemande[]>([]);
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

  if (loading) {
    return (
      <div className="space-y-4 py-2" role="status">
        <span className="sr-only">Chargement…</span>
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

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

  return (
    <div className="space-y-6">
      <section className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Bonjour{firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Voici les nouvelles demandes autour de chez vous.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <Icon name="logout" size="sm" />
          <span className="ml-1 hidden sm:inline">Déconnexion</span>
        </Button>
      </section>

      {/* Niveau 1 — CTA principal (action immédiate dominante) */}
      <section>
        <Link href="#nouvelles-demandes" className="block">
          <Button size="lg" className="w-full gap-2 text-base">
            <Icon name="search" size="md" strokeWidth={2} />
            Voir les nouvelles demandes
          </Button>
        </Link>
      </section>

      {/* Disponibilité — carte dégradée façon « live » */}
      <section>
        <AvailabilityCard
          isAvailable={profile?.isAvailable ?? false}
          busy={availabilityBusy}
          error={availabilityError}
          onToggle={() => void handleToggleAvailability()}
        />
      </section>

      {/* Quick actions */}
      <QuickActions />

      {/* Statistiques rapides */}
      <section className="grid grid-cols-3 gap-3">
        <StatBlock icon="users" label="Nouvelles" value={available.length} />
        <StatBlock icon="clock" label="En cours" value={activeCount} />
        <StatBlock
          icon="check-circle"
          label="Terminées"
          value={doneCount}
          href="/technicien/historique"
        />
      </section>

      {/* Intervention en cours — carte « live » animée */}
      {currentMission ? (
        <section className="space-y-3">
          <SectionHeader title="Intervention en cours" />
          <TechnicianLiveMissionCard mission={currentMission} />
        </section>
      ) : null}

      {/* Nouvelles demandes */}
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
            description="Il n’y a pas de demande correspondant à votre profil et votre zone pour le moment."
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

      {/* Mes interventions */}
      {mine.length > 0 ? (
        <section className="space-y-3">
          <SectionHeader
            title="Mes interventions"
            action={
              <Badge variant="success">
                {mine.length} intervention{mine.length !== 1 ? 's' : ''}
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

      {/* Feed d'activité */}
      <section className="space-y-3">
        <SectionHeader title="Activité récente" />
        <ActivityFeed items={activities} />
      </section>

      {/* Gamification — interventions terminées */}
      <InterventionsCard completedCount={doneCount} />

      {/* Mon compte */}
      <section className="space-y-3">
        <SectionHeader title="Mon compte" />
        <div className="space-y-2">
          <Link href="/technicien/profil" className="block">
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

function StatBlock({
  icon,
  label,
  value,
  href,
}: {
  icon: 'users' | 'clock' | 'check-circle';
  label: string;
  value: number;
  href?: string;
}) {
  const content = (
    <Card className={href ? 'transition-colors hover:bg-muted/50' : undefined}>
      <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
        <Icon name={icon} className="text-primary" />
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}