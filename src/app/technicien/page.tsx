'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { DemandeStatusBadge } from '@/components/ui/status-badge';
import { TechnicianDemandeCard } from '@/components/technician/technician-demande-card';
import { getMe, logout } from '@/lib/api/auth-service';
import {
  listAvailableDemandes,
  listMyDemandes,
  getTechnicianProfile,
  updateTechnicianAvailability,
  type TechnicianDemande,
  type TechnicianProfile,
} from '@/lib/api/technician-service';
import { formatRequestedTiming } from '@/lib/request-timing';
import { formatDate } from '@/lib/format';

const ACTIVE_STATUSES = ['ACCEPTED', 'SCHEDULED', 'IN_PROGRESS'];
const DONE_STATUSES = ['COMPLETED', 'CONFIRMED'];

export default function TechnicianDashboardPage() {
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [available, setAvailable] = useState<TechnicianDemande[]>([]);
  const [mine, setMine] = useState<TechnicianDemande[]>([]);
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
        const [profileData, availableList, myList] = await Promise.all([
          getTechnicianProfile(),
          listAvailableDemandes(),
          listMyDemandes(),
        ]);
        if (!cancelled) {
          setProfile(profileData);
          setFirstName(me.firstName ?? null);
          setAvailable(availableList);
          setMine(myList);
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
    await logout();
    window.location.href = '/technicien/connexion';
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
  const doneCount = mine.filter((d) => DONE_STATUSES.includes(d.status)).length;

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
          <Link href="/technicien/connexion">
            <Button>Se connecter en tant que technicien</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bonjour${firstName ? ` ${firstName}` : ''}`}
        description="Voici les nouvelles demandes autour de chez vous."
        actions={
          <>
            <Link href="/technicien/profil">
              <Button variant="outline" size="sm">
                <Icon name="user" size="sm" />
                Profil
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Déconnexion
            </Button>
          </>
        }
      />

      <section className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Icon
                name="clock"
                size="sm"
                className={profile?.isAvailable ? 'text-success' : 'text-muted-foreground'}
              />
              Ma disponibilité
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {profile?.isAvailable
                ? 'Disponible — les interventions urgentes vous sont proposées en priorité.'
                : 'Indisponible — activez votre disponibilité pour recevoir de nouvelles demandes.'}
            </p>
          </div>
          <Switch
            checked={profile?.isAvailable ?? false}
            onCheckedChange={handleToggleAvailability}
            disabled={availabilityBusy || !profile}
            aria-label={
              profile?.isAvailable ? 'Passer indisponible' : 'Me rendre disponible'
            }
          />
        </div>
        {availabilityError ? <Alert variant="error" dense className="mt-3">{availabilityError}</Alert> : null}
      </section>

      <section className="grid grid-cols-3 gap-3">
        <StatBlock icon="users" label="Nouvelles" value={available.length} />
        <StatBlock icon="clock" label="En cours" value={activeCount} />
        <StatBlock icon="check-circle" label="Terminées" value={doneCount} />
      </section>

      {currentMission ? (
        <section className="space-y-3">
          <SectionHeader title="Intervention en cours" />
          <Link href={`/technicien/demandes/${currentMission.id}`} className="block">
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
      ) : null}

      <section className="space-y-3">
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
              <TechnicianDemandeCard key={d.id} demande={d} detailHref={`/technicien/demandes/${d.id}`} />
            ))}
          </div>
        )}
      </section>

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
              <TechnicianDemandeCard key={d.id} demande={d} detailHref={`/technicien/demandes/${d.id}`} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function StatBlock({
  icon,
  label,
  value,
}: {
  icon: 'users' | 'clock' | 'check-circle';
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
        <Icon name={icon} className="text-primary" />
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}