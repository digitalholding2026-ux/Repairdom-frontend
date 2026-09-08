'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
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

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Nouvelle',
  PENDING: 'En attente',
  ACCEPTED: 'Acceptée',
  SCHEDULED: 'Rendez-vous fixé',
  IN_PROGRESS: 'Intervention en cours',
  COMPLETED: 'Terminée',
  CONFIRMED: 'Confirmée',
  CANCELED: 'Annulée',
};

const STATUS_VARIANTS: Record<string, 'info' | 'warning' | 'success' | 'danger' | 'neutral'> = {
  SUBMITTED: 'info',
  PENDING: 'warning',
  ACCEPTED: 'success',
  SCHEDULED: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'warning',
  CONFIRMED: 'success',
  CANCELED: 'danger',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function DemandeCard({ demande, detailHref }: { demande: TechnicianDemande; detailHref: string }) {
  return (
    <Link href={detailHref} className="block">
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-semibold text-primary">{demande.reference}</span>
            <Badge variant={STATUS_VARIANTS[demande.status] ?? 'neutral'}>
              {STATUS_LABELS[demande.status] ?? demande.status}
            </Badge>
          </div>
          <p className="text-sm font-medium">{demande.categoryLabel}</p>
          <p className="line-clamp-2 text-sm text-muted-foreground">{demande.description}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{demande.city}</span>
            <span>·</span>
            <span>{formatDate(demande.createdAt)}</span>
          </div>
          <p className="text-xs font-medium">
            {demande.requestedMode === 'SCHEDULED' ? (
              <>
                📅 Intervention souhaitée — {formatRequestedTiming(demande.requestedMode, demande.requestedAt)}
              </>
            ) : (
              <>🚨 Intervention dès que possible</>
            )}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function TechnicianDashboardPage() {
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
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
      <section className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Demandes disponibles</h1>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Déconnexion
        </Button>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Ma disponibilité</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {profile?.isAvailable
                ? '🟢 Disponible — interventions urgentes proposées en priorité.'
                : '⚪ Indisponible — activez votre disponibilité pour être prioritaire sur les interventions urgentes.'}
            </p>
          </div>
          <Button
            variant={profile?.isAvailable ? 'secondary' : 'primary'}
            size="sm"
            onClick={handleToggleAvailability}
            isLoading={availabilityBusy}
            disabled={!profile}
          >
            {profile?.isAvailable ? 'Passer indisponible' : 'Me rendre disponible'}
          </Button>
        </div>
        {availabilityError ? (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{availabilityError}</p>
        ) : null}
      </section>

      <section>
        <Badge variant="info">{available.length} demande{available.length !== 1 ? 's' : ''}</Badge>
      </section>

      {available.length === 0 ? (
        <EmptyState
          title="Aucune demande disponible"
          description="Il n'y a pas de demande correspondant à votre profil et votre zone pour le moment."
        />
      ) : (
        <div className="space-y-3">
          {available.map((d) => (
            <DemandeCard key={d.id} demande={d} detailHref={`/technicien/demandes/${d.id}`} />
          ))}
        </div>
      )}

      {mine.length > 0 ? (
        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">Mes interventions</h2>
          <Badge variant="success">{mine.length} intervention{mine.length !== 1 ? 's' : ''}</Badge>
          {mine.map((d) => (
            <DemandeCard key={d.id} demande={d} detailHref={`/technicien/demandes/${d.id}`} />
          ))}
        </section>
      ) : null}
    </div>
  );
}