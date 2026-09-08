'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  getTechnicianDemande,
  acceptDemande,
  updateTechnicianDemandeStatus,
  type TechnicianDemande,
} from '@/lib/api/technician-service';

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
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TechnicianDemandeDetailPage() {
  const params = useParams<{ id: string }>();
  const [demande, setDemande] = useState<TechnicianDemande | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [scheduledValue, setScheduledValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!params?.id) return;
      try {
        const d = await getTechnicianDemande(params.id);
        if (!cancelled) setDemande(d);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur de chargement.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [params?.id]);

  const handleAccept = async () => {
    if (!params?.id) return;
    setActionBusy('ACCEPTED');
    setError(null);
    try {
      const updated = await acceptDemande(params.id);
      setDemande(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'acceptation.');
    } finally {
      setActionBusy(null);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!params?.id) return;
    setActionBusy(status);
    setError(null);
    try {
      const updated = await updateTechnicianDemandeStatus(params.id, status);
      setDemande(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour.');
    } finally {
      setActionBusy(null);
    }
  };

  const handleSchedule = async () => {
    if (!params?.id) return;
    setActionBusy('SCHEDULED');
    setError(null);
    try {
      const updated = await updateTechnicianDemandeStatus(
        params.id,
        'SCHEDULED',
        new Date(scheduledValue).toISOString(),
      );
      setDemande(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la planification.');
    } finally {
      setActionBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !demande) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
        <Link href="/technicien">
          <Button variant="secondary">Retour aux demandes</Button>
        </Link>
      </div>
    );
  }

  if (!demande) return null;

  const canAccept = demande.status === 'SUBMITTED' || demande.status === 'PENDING';

  return (
    <div className="space-y-4">
      <Link href="/technicien" className="text-sm font-medium text-primary hover:underline">
        ← Retour aux demandes
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <span className="font-mono text-lg font-semibold text-primary">{demande.reference}</span>
            <Badge variant={STATUS_VARIANTS[demande.status] ?? 'neutral'}>
              {STATUS_LABELS[demande.status] ?? demande.status}
            </Badge>
          </div>
          <CardTitle className="text-base">{demande.categoryLabel}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</h2>
            <p className="whitespace-pre-line text-sm">{demande.description}</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Localisation</h2>
            <p className="text-sm font-medium">{demande.city}</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date de la demande</h2>
            <p className="text-sm">{formatDate(demande.createdAt)}</p>
          </div>

          {demande.scheduledAt ? (
            <div className="space-y-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rendez-vous prévu</h2>
              <p className="text-sm font-medium">{formatDateTime(demande.scheduledAt)}</p>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          ) : null}

          {canAccept ? (
            <Button
              onClick={handleAccept}
              isLoading={actionBusy === 'ACCEPTED'}
              className="w-full"
              size="lg"
            >
              Accepter la demande
            </Button>
          ) : null}

          {demande.status === 'ACCEPTED' ? (
            <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-3">
              <div className="space-y-1">
                <label
                  htmlFor="scheduledAt"
                  className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Date et heure de l&apos;intervention
                </label>
                <input
                  id="scheduledAt"
                  type="datetime-local"
                  value={scheduledValue}
                  onChange={(event) => setScheduledValue(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <Button
                onClick={handleSchedule}
                isLoading={actionBusy === 'SCHEDULED'}
                disabled={!scheduledValue}
                className="w-full"
                size="lg"
              >
                Planifier l&apos;intervention
              </Button>
            </div>
          ) : null}

          {demande.status === 'SCHEDULED' ? (
            <Button
              onClick={() => handleStatusChange('IN_PROGRESS')}
              isLoading={actionBusy === 'IN_PROGRESS'}
              className="w-full"
              size="lg"
            >
              Démarrer l&apos;intervention
            </Button>
          ) : null}

          {demande.status === 'IN_PROGRESS' ? (
            <Button
              onClick={() => handleStatusChange('COMPLETED')}
              isLoading={actionBusy === 'COMPLETED'}
              className="w-full"
              size="lg"
            >
              Marquer comme terminée
            </Button>
          ) : null}

          {demande.status === 'COMPLETED' ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/30 dark:text-amber-300">
              Intervention terminée. En attente de confirmation du client.
            </div>
          ) : null}

          {demande.status === 'CONFIRMED' ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/30 dark:text-emerald-300">
              Intervention confirmée par le client.
            </div>
          ) : null}

          {demande.status === 'CANCELED' ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-300">
              Cette demande a été annulée.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}