import { DemandeStatusBadge } from '@/components/ui/status-badge';
import { Icon } from '@/components/ui/icon';
import type { TechnicianDemande } from '@/lib/api/technician-service';
import { formatCurrency, fullName } from '@/lib/format';
import { MissionCard, MissionCardPerson, deviceLabelFor } from '@/components/mission/mission-card';

export interface TechnicianDemandeCardProps {
  demande: TechnicianDemande;
  detailHref: string;
}

export function TechnicianDemandeCard({ demande, detailHref }: TechnicianDemandeCardProps) {
  return (
    <MissionCard
      reference={demande.reference}
      badge={<DemandeStatusBadge status={demande.status} context="technician" />}
      categoryLabel={demande.categoryLabel}
      deviceLabel={deviceLabelFor(demande)}
      description={demande.description}
      city={demande.city}
      createdAt={demande.createdAt}
      requestedMode={demande.requestedMode}
      requestedAt={demande.requestedAt}
      href={detailHref}
      footer={
        typeof demande.distanceMeters === 'number' ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Icon name="pin" size="3.5" />
            {formatDistance(demande.distanceMeters)}
          </span>
        ) : undefined
      }
    />
  );
}

/* GPS V2 — distance informative (jamais de coordonnées brutes). */
function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '';
  if (meters < 1000) return `à ~${Math.round(meters)} m`;
  const km = meters / 1000;
  return `à ~${km.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`;
}

/** Carte d'historique technicien (missions confirmées / annulées) :
 *  référence, appareil (domaine/marque/modèle/problème), date, statut
 *  (Terminée/Annulée), client, montant final et réputation du client. */
export function TechnicianHistoryDemandeCard({
  demande,
  detailHref,
}: {
  demande: TechnicianDemande;
  detailHref: string;
}) {
  const reputation = demande.clientReputation;
  return (
    <MissionCard
      reference={demande.reference}
      badge={<DemandeStatusBadge status={demande.status} context="history" />}
      categoryLabel={demande.categoryLabel}
      deviceLabel={deviceLabelFor(demande)}
      description={demande.description}
      city={demande.city}
      createdAt={demande.createdAt}
      showTiming={false}
      href={detailHref}
      footer={
        demande.client ? (
          <MissionCardPerson
            name={fullName(demande.client.firstName, demande.client.lastName)}
            amount={formatCurrency(demande.finalAmount)}
            extra={
              reputation && reputation.totalReviews > 0 ? (
                <span className="inline-flex shrink-0 items-center gap-1 font-medium text-foreground">
                  <Icon name="star" size="3.5" />
                  {reputation.averageRating?.toLocaleString('fr-FR') ?? '—'} ({reputation.totalReviews} avis)
                </span>
              ) : undefined
            }
          />
        ) : undefined
      }
    />
  );
}
