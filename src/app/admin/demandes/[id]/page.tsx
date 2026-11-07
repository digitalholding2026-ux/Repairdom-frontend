'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { getAdminMissionByReference, type SupervisedMission } from '@/lib/api/admin-service';
import { updateDemandeStatus } from '@/lib/api/request-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';

function statusVariant(status: string): string {
  switch (status) {
    case 'ACCEPTED':
    case 'SCHEDULED':
    case 'IN_PROGRESS':
      return 'bg-info-soft text-info-ink';
    case 'COMPLETED':
      return 'bg-success-soft text-success-ink';
    case 'CANCELED':
      return 'bg-error-soft text-error-ink';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function formatStatus(status: string): string {
  const map: Record<string, string> = {
    SUBMITTED: 'Soumis',
    PENDING: 'En attente',
    ACCEPTED: 'Accepté',
    SCHEDULED: 'Planifié',
    IN_PROGRESS: 'En cours',
    COMPLETED: 'Terminé',
    CANCELED: 'Annulé',
  };
  return map[status] ?? status;
}

export default function AdminDemandeDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const reference = (Array.isArray(id) ? id[0] : id ?? '').toUpperCase();
  const [mission, setMission] = useState<SupervisedMission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    void getAdminMissionByReference(reference)
      .then((data) => {
        setMission(data);
        setError(null);
      })
      .catch((err) => {
        setError(toUserErrorMessage(err, 'Impossible de charger la demande.'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [reference]);

  const handleStatusChange = async (newStatus: string) => {
    if (!mission) return;
    setUpdating(true);
    try {
      await updateDemandeStatus(mission.reference, newStatus);
      setMission((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch (err) {
      setError(toUserErrorMessage(err, 'Impossible de changer le statut.'));
    } finally {
      setUpdating(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-5">
        <PageHeader title="Demande" description="Détail de la demande." />
        <Alert variant="error">{error}</Alert>
        <Button variant="secondary" onClick={() => router.push('/admin/demandes')}>
          Retour à la liste
        </Button>
      </div>
    );
  }

  if (loading || !mission) {
    return (
      <div className="space-y-5">
        <PageHeader title="Demande" description="Détail de la demande." />
        <div role="status" aria-label="Chargement">
          <span className="sr-only">Chargement…</span>
          <Spinner />
        </div>
      </div>
    );
  }

  const statusOptions = [
    { value: 'ACCEPTED', label: 'Prendre en charge' },
    { value: 'IN_PROGRESS', label: 'En cours' },
    { value: 'COMPLETED', label: 'Terminer' },
    { value: 'CANCELED', label: 'Annuler' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Demande ${mission.reference}`}
        description="Gestion et supervision de la demande client."
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Client */}
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-sm font-semibold mb-3">Client</h3>
          {mission.client ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {mission.client.firstName} {mission.client.lastName ?? ''}
              </p>
              <p className="text-xs text-muted-foreground">
                {mission.client.phone ?? '—'}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">—</p>
          )}
        </div>

        {/* Adresse / Contact */}
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-sm font-semibold mb-3">Lieu de l'intervention</h3>
          <div className="space-y-2 text-sm">
            <p>
              {mission.contact.address ?? '—'}{' '}
              {mission.contact.neighborhood ? `, ${mission.contact.neighborhood}` : ''}
            </p>
            <p>{mission.contact.city ?? '—'}</p>
            <p className="text-xs text-muted-foreground">
              {mission.contact.contactPhone ?? '—'}
            </p>
          </div>
        </div>

        {/* Équipement / Problème */}
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-sm font-semibold mb-3">Prestation</h3>
          <div className="space-y-2 text-sm">
            <p>
              {mission.device.problem?.name ?? mission.category}
            </p>
            {mission.device.brand?.name && mission.device.model?.name ? (
              <p className="text-xs text-muted-foreground">
                {mission.device.brand.name} {mission.device.model.name}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Montant et statut */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-sm font-semibold mb-3">Montant final</h3>
          <p className="text-2xl font-semibold">
            {mission.finalAmount != null ? formatCurrency(mission.finalAmount, 'XAF') : '—'}
          </p>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-sm font-semibold mb-3">Statut actuel</h3>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusVariant(mission.status)}`}>
            {formatStatus(mission.status)}
          </span>
        </div>
        <div className="bg-card rounded-xl border p-5 flex flex-col justify-between">
          <h3 className="text-sm font-semibold mb-3">Changer le statut</h3>
          <select
            value={mission.status}
            onChange={(e) => void handleStatusChange(e.target.value)}
            disabled={updating}
            className="w-full h-11 appearance-none rounded-lg border border-border bg-card pl-3.5 pr-10 text-base text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
          >
            {statusOptions
              .filter((o) => o.value !== mission.status)
              .map((o) => (
                <option key={o.value} value={o.value} disabled={updating}>
                  {o.label}
                </option>
              ))}
          </select>
          {updating && <Spinner className="h-4 w-4 mx-auto mt-2" />}
        </div>
      </div>

      {/* Diagnostics */}
      {mission.diagnostics.length > 0 && (
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-sm font-semibold mb-3">Diagnostics</h3>
          <div className="divide-y">
            {mission.diagnostics.map((d) => (
              <div key={d.id} className="py-3">
                <p className="text-sm font-medium">{d.content}</p>
                {d.proposedIntervention && (
                  <p className="text-xs text-muted-foreground">
                    Intervention proposée : {d.proposedIntervention}
                  </p>
                )}
                {d.justification && (
                  <p className="text-xs text-muted-foreground">
                    Justification : {d.justification}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Devis */}
      {mission.quotes.length > 0 && (
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-sm font-semibold mb-3">Devis</h3>
          <div className="divide-y">
            {mission.quotes.map((q) => (
              <div key={q.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {q.amount.toLocaleString('fr-FR')} FCFA
                  </p>
                  <p className="text-xs text-muted-foreground">{q.description}</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground`}>
                  {q.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <Button variant="outline" onClick={() => router.push('/admin/demandes')}>
          Retour à la liste
        </Button>
      </div>
    </div>
  );
}
