import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { DemandeStatusBadge } from '@/components/ui/status-badge';
import { Icon } from '@/components/ui/icon';
import type { DemandeListItem } from '@/lib/api/request-service';
import { formatRequestedTiming } from '@/lib/request-timing';
import { formatDate, fullName } from '@/lib/format';

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

function formatPrice(value: number | null | undefined): string {
  return value == null ? '—' : `${value.toLocaleString('fr-FR')} XAF`;
}

export function DemandeCard({ demande }: DemandeCardProps) {
  return (
    <Card className="transition-colors hover:bg-muted/50">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="font-mono text-sm font-semibold text-primary">{demande.reference}</span>
          <DemandeStatusBadge status={demande.status} />
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
        </div>
        <p className="mt-2 text-xs font-medium text-foreground">
          {demande.requestedMode === 'SCHEDULED' ? 'Intervention souhaitée' : 'Intervention'} :{' '}
          {formatRequestedTiming(demande.requestedMode, demande.requestedAt)}
        </p>
      </div>
    </Card>
  );
}

export function DemandesList({ demandes, emptyHref }: { demandes: DemandeListItem[]; emptyHref: string }) {
  if (demandes.length === 0) {
    return (
      <Link href={emptyHref} className="block">
        <DemandeCardEmpty />
      </Link>
    );
  }
  return (
    <div className="space-y-3">
      {demandes.map((d) => (
        <Link key={d.id} href={`/client/demandes/${d.id}`} className="block">
          <DemandeCard demande={d} />
        </Link>
      ))}
    </div>
  );
}

function DemandeCardEmpty() {
  return (
    <Card className="border-dashed">
      <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon name="briefcase" size="lg" />
        </span>
        <p className="text-sm font-medium">Aucune demande dans cette catégorie</p>
        <p className="text-sm text-muted-foreground">Changer de filtre ou en déposer une nouvelle.</p>
      </div>
    </Card>
  );
}

/** Carte d'historique (missions confirmées / annulées) côté client :
 *  référence, appareil (domaine/marque/modèle/problème), date, statut
 *  (Terminée/Annulée), technicien assigné et montant final. */
export function HistoryDemandeCard({
  demande,
  labelOverride,
}: {
  demande: DemandeListItem;
  labelOverride?: string;
}) {
  const deviceLabel = deviceLabelFor(demande);
  return (
    <Card className="transition-colors hover:bg-muted/50">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="font-mono text-sm font-semibold text-primary">{demande.reference}</span>
          <DemandeStatusBadge status={demande.status} labelOverride={labelOverride} />
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
        {demande.technician ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
            <span className="inline-flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground">
              <Icon name="user" size="3.5" />
              <span className="truncate">
                {fullName(demande.technician.firstName, demande.technician.lastName)}
              </span>
            </span>
            <span className="shrink-0 text-sm font-semibold text-foreground">
              {formatPrice(demande.finalAmount)}
            </span>
          </div>
        ) : null}
      </div>
    </Card>
  );
}