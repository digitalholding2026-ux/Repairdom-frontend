import { Card } from '@/components/ui/card';
import { DemandeStatusBadge } from '@/components/ui/status-badge';
import { Icon } from '@/components/ui/icon';
import type { DemandeListItem } from '@/lib/api/request-service';
import { formatRequestedTiming } from '@/lib/request-timing';
import { formatCurrency, formatDate, fullName } from '@/lib/format';

export interface DemandeCardProps {
  demande: DemandeListItem;
}

function deviceLabelFor(demande: DemandeListItem): string {
  return [
    demande.domain?.name,
    demande.brand?.name,
    demande.model?.name,
    demande.problem?.name,
  ]
    .filter(Boolean)
    .join(' — ');
}

export function DemandeCard({ demande }: DemandeCardProps) {
  const deviceLabel = deviceLabelFor(demande);
  const scheduled = demande.requestedMode === 'SCHEDULED';
  return (
    <Card className="transition-colors hover:border-primary/40 hover:bg-muted/50">
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-sm font-semibold text-primary">{demande.reference}</span>
          <DemandeStatusBadge status={demande.status} />
        </div>

        <div className="mt-3 flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon name="wrench" size="sm" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{demande.categoryLabel}</p>
            {deviceLabel ? (
              <p className="truncate text-xs text-muted-foreground">{deviceLabel}</p>
            ) : null}
          </div>
        </div>

        {demande.description ? (
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{demande.description}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Icon name="pin" size="3.5" />
            {demande.city}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="calendar" size="3.5" />
            {formatDate(demande.createdAt)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name={scheduled ? 'calendar' : 'clock'} size="3.5" />
            {scheduled
              ? formatRequestedTiming(demande.requestedMode, demande.requestedAt)
              : 'Intervention dès que possible'}
          </span>
        </div>
      </div>
    </Card>
  );
}

/** Carte d'historique (missions confirmées / annulées) côté client :
 *  référence, appareil (domaine/marque/modèle/problème), date, statut
 *  (Terminée/Annulée), technicien assigné et montant final. */
export function HistoryDemandeCard({
  demande,
}: {
  demande: DemandeListItem;
}) {
  const deviceLabel = deviceLabelFor(demande);
  return (
    <Card className="transition-colors hover:border-primary/40 hover:bg-muted/50">
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-sm font-semibold text-primary">{demande.reference}</span>
          <DemandeStatusBadge status={demande.status} context="history" />
        </div>

        <div className="mt-3 flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon name="wrench" size="sm" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{demande.categoryLabel}</p>
            {deviceLabel ? (
              <p className="truncate text-xs text-muted-foreground">{deviceLabel}</p>
            ) : null}
          </div>
        </div>

        {demande.description ? (
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{demande.description}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Icon name="pin" size="3.5" />
            {demande.city}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="calendar" size="3.5" />
            {formatDate(demande.createdAt)}
          </span>
        </div>

        {demande.technician ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-3.5 py-2.5">
            <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon name="user" size="3.5" />
              </span>
              <span className="truncate font-medium text-foreground">
                {fullName(demande.technician.firstName, demande.technician.lastName)}
              </span>
            </span>
            <span className="shrink-0 font-mono text-sm font-semibold text-foreground">
              {formatCurrency(demande.finalAmount)}
            </span>
          </div>
        ) : null}
      </div>
    </Card>
  );
}