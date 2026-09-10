import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { DemandeStatusBadge } from '@/components/ui/status-badge';
import { Icon } from '@/components/ui/icon';
import type { TechnicianDemande } from '@/lib/api/technician-service';
import { formatRequestedTiming } from '@/lib/request-timing';
import { formatDate, fullName } from '@/lib/format';

export interface TechnicianDemandeCardProps {
  demande: TechnicianDemande;
  detailHref: string;
}

function deviceLabelFor(demande: TechnicianDemande): string {
  return [
    demande.domain?.name,
    demande.brand?.name,
    demande.model?.name,
    demande.problem?.name,
  ]
    .filter(Boolean)
    .join(' — ');
}

function formatPrice(value: number | null | undefined): string {
  return value == null ? '—' : `${value.toLocaleString('fr-FR')} XAF`;
}

export function TechnicianDemandeCard({ demande, detailHref }: TechnicianDemandeCardProps) {
  return (
    <Link href={detailHref} className="block">
      <Card className="transition-colors hover:bg-muted/50">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <span className="font-mono text-sm font-semibold text-primary">{demande.reference}</span>
            <DemandeStatusBadge status={demande.status} context="technician" />
          </div>
          <p className="mt-2 text-sm font-medium">{demande.categoryLabel}</p>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{demande.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Icon name="pin" size="3.5" />
              {demande.city}
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="calendar" size="3.5" />
              {formatDate(demande.createdAt)}
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              {demande.requestedMode === 'SCHEDULED' ? (
                <><Icon name="calendar" size="3.5" /> {formatRequestedTiming(demande.requestedMode, demande.requestedAt)}</>
              ) : (
                <><Icon name="clock" size="3.5" /> Intervention dès que possible</>
              )}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

/** Carte d'historique technicien (missions confirmées / annulées) :
 *  référence, appareil (domaine/marque/modèle/problème), date, statut
 *  (Terminée/Annulée), client, montant final et réputation du client. */
export function TechnicianHistoryDemandeCard({
  demande,
  detailHref,
  labelOverride,
}: {
  demande: TechnicianDemande;
  detailHref: string;
  labelOverride?: string;
}) {
  const deviceLabel = deviceLabelFor(demande);
  const reputation = demande.clientReputation;
  return (
    <Link href={detailHref} className="block">
      <Card className="transition-colors hover:bg-muted/50">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <span className="font-mono text-sm font-semibold text-primary">{demande.reference}</span>
            <DemandeStatusBadge status={demande.status} context="technician" labelOverride={labelOverride} />
          </div>
          <p className="mt-2 text-sm font-medium">{demande.categoryLabel}</p>
          {deviceLabel ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{deviceLabel}</p>
          ) : null}
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{demande.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Icon name="pin" size="3.5" />
              {demande.city}
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="calendar" size="3.5" />
              {formatDate(demande.createdAt)}
            </span>
          </div>
          {demande.client ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
              <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                <Icon name="user" size="3.5" />
                <span className="truncate">
                  {fullName(demande.client.firstName, demande.client.lastName)}
                </span>
                {reputation && reputation.totalReviews > 0 ? (
                  <span className="inline-flex shrink-0 items-center gap-1 font-medium text-foreground">
                    <Icon name="star" size="3.5" />
                    {reputation.averageRating?.toLocaleString('fr-FR') ?? '—'} ({reputation.totalReviews} avis)
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-sm font-semibold text-foreground">
                {formatPrice(demande.finalAmount)}
              </span>
            </div>
          ) : null}
        </div>
      </Card>
    </Link>
  );
}