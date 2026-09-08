'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { getDemande, updateDemandeStatus, type DemandeListItem } from '@/lib/api/request-service';

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Recherche de technicien',
  PENDING: 'En attente',
  ACCEPTED: 'Technicien trouvé',
  SCHEDULED: 'Rendez-vous fixé',
  IN_PROGRESS: 'Intervention en cours',
  COMPLETED: 'Intervention terminée',
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

const PROGRESS_STEPS = [
  'Demande déposée',
  'Technicien trouvé',
  'Rendez-vous fixé',
  'Intervention en cours',
  'Intervention terminée',
  'Confirmée',
];

const STATUS_STEP_INDEX: Record<string, number> = {
  SUBMITTED: 0,
  PENDING: 0,
  ACCEPTED: 1,
  SCHEDULED: 2,
  IN_PROGRESS: 3,
  COMPLETED: 4,
  CONFIRMED: 5,
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

export default function ClientDemandeDetailPage() {
  const params = useParams<{ id: string }>();
  const [demande, setDemande] = useState<DemandeListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!params?.id) return;
      try {
        const d = await getDemande(params.id);
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

  const handleStatusChange = async (status: 'CONFIRMED' | 'CANCELED') => {
    if (!params?.id) return;
    setActionBusy(status);
    setError(null);
    try {
      const updated = await updateDemandeStatus(params.id, status);
      setDemande(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour.');
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
        <Link href="/client/demandes">
          <Button variant="secondary">Retour à mes demandes</Button>
        </Link>
      </div>
    );
  }

  if (!demande) return null;

  const stepIndex = STATUS_STEP_INDEX[demande.status];
  const canCancel = ['SUBMITTED', 'PENDING', 'ACCEPTED', 'SCHEDULED'].includes(demande.status);

  return (
    <div className="space-y-4">
      <Link href="/client/demandes" className="text-sm font-medium text-primary hover:underline">
        ← Retour à mes demandes
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

          {demande.status === 'CANCELED' ? null : stepIndex !== undefined ? (
            <div className="space-y-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Avancement</h2>
              <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
                {PROGRESS_STEPS.map((label, index) => (
                  <li key={label} className="flex items-center gap-2">
                    <span
                      className={
                        index <= stepIndex
                          ? 'flex size-3 items-center justify-center rounded-full bg-primary'
                          : 'flex size-3 items-center justify-center rounded-full border border-muted-foreground/40'
                      }
                    />
                    <span
                      className={
                        index <= stepIndex
                          ? 'text-xs font-medium text-foreground'
                          : 'text-xs text-muted-foreground'
                      }
                    >
                      {label}
                    </span>
                    {index < PROGRESS_STEPS.length - 1 ? (
                      <span className="text-muted-foreground/40">·</span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {demande.technician ? (
            <div className="space-y-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Technicien assigné</h2>
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="text-sm font-medium">
                  {demande.technician.firstName}
                  {demande.technician.lastName ? ` ${demande.technician.lastName}` : ''}
                </p>
                {demande.technician.city ? (
                  <p className="mt-1 text-xs text-muted-foreground">{demande.technician.city}</p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Technicien</h2>
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground">Recherche d&apos;un technicien adapté à votre panne…</p>
              </div>
            </div>
          )}

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          ) : null}

          {demande.status === 'COMPLETED' ? (
            <Button
              onClick={() => handleStatusChange('CONFIRMED')}
              isLoading={actionBusy === 'CONFIRMED'}
              className="w-full"
              size="lg"
            >
              Confirmer l&apos;intervention
            </Button>
          ) : null}

          {canCancel ? (
            <Button
              onClick={() => handleStatusChange('CANCELED')}
              variant="destructive"
              isLoading={actionBusy === 'CANCELED'}
              className="w-full"
              size="lg"
            >
              Annuler la demande
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}