'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { listAdminDemandes, type AdminDemandeListItem } from '@/lib/api/admin-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'SUBMITTED', label: 'Soumis' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'ACCEPTED', label: 'Accepté' },
  { value: 'SCHEDULED', label: 'Planifié' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'COMPLETED', label: 'Terminé' },
  { value: 'CANCELED', label: 'Annulé' },
];

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

export default function AdminDemandesPage() {
  const router = useRouter();
  const [items, setItems] = useState<AdminDemandeListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAdminDemandes({ status: statusFilter || undefined, limit: 50 });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Impossible de charger les demandes.'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => items.filter((item) => !statusFilter || item.status === statusFilter),
    [items, statusFilter],
  );

  if (error) {
    return (
      <div className="space-y-5">
        <PageHeader title="Demandes" description="Gestion des demandes clients." />
        <Alert variant="error">{error}</Alert>
        <Button variant="secondary" onClick={() => void load()}>
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Demandes" description="Liste et supervision des demandes clients." />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:gap-4">
          <div className="flex-1 sm:flex-1">
            <Field label="Filtrer par statut">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-11 appearance-none rounded-lg border border-border bg-card pl-3.5 pr-10 text-base text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
              >
                <option value="">Tous</option>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button
              variant="outline"
              onClick={() => {
                setStatusFilter('');
                void load();
              }}
            >
              Réinitialiser
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto border rounded-xl">
          {loading ? (
            <div className="p-4" role="status" aria-label="Chargement des demandes">
              <span className="sr-only">Chargement…</span>
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState title="Aucune demande" description="Aucune demande ne correspond aux filtres sélectionnés." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-semibold text-muted-foreground">
                  <th className="pb-3">Référence</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Client</th>
                  <th className="pb-3">Service / Problème</th>
                  <th className="pb-3">Montant</th>
                  <th className="pb-3">Statut</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => router.push(`/admin/demandes/${item.id}`)}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <td className="pb-3 font-mono text-xs">{item.reference}</td>
                    <td className="pb-3 text-xs">{formatDateTime(item.createdAt)}</td>
                    <td className="pb-3 text-xs">
                      {item.client ? (
                        <>
                          {item.client.firstName} {item.client.lastName ?? ''}
                          <br />
                          <span className="text-muted-foreground">{item.client.phone ?? '—'}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="pb-3 text-xs">
                      {item.device.problem?.name ?? item.category}
                      {item.device.brand?.name && item.device.model?.name ? (
                        <>
                          <br />
                          <span className="text-muted-foreground text-xs">
                            {item.device.brand.name} {item.device.model.name}
                          </span>
                        </>
                      ) : null}
                    </td>
                    <td className="pb-3 text-xs">
                      {item.finalAmount != null ? formatCurrency(item.finalAmount, 'XAF') : '—'}
                    </td>
                    <td className="pb-3 text-xs">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusVariant(item.status)}`}>
                        {formatStatus(item.status)}
                      </span>
                    </td>
                    <td className="pb-3 text-right text-xs">
                      <Button variant="ghost" size="sm" onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/admin/demandes/${item.id}`);
                      }}>
                        Voir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {filtered.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {filtered.length} demande{filtered.length > 1 ? 's' : ''} sur {total}
          </p>
        )}
      </div>
    </div>
  );
}
