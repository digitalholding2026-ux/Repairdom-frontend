import { DemandeStatusBadge } from '@/components/ui/status-badge';
import type { DemandeListItem } from '@/lib/api/request-service';
import { formatCurrency, fullName } from '@/lib/format';
import { MissionCard, MissionCardPerson, deviceLabelFor } from '@/components/mission/mission-card';

export interface DemandeCardProps {
  demande: DemandeListItem;
}

export function DemandeCard({ demande }: DemandeCardProps) {
  return (
    <MissionCard
      reference={demande.reference}
      badge={<DemandeStatusBadge status={demande.status} />}
      categoryLabel={demande.categoryLabel}
      deviceLabel={deviceLabelFor(demande)}
      description={demande.description}
      city={demande.city}
      createdAt={demande.createdAt}
      requestedMode={demande.requestedMode}
      requestedAt={demande.requestedAt}
    />
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
      footer={
        demande.technician ? (
          <MissionCardPerson
            name={fullName(demande.technician.firstName, demande.technician.lastName)}
            amount={formatCurrency(demande.finalAmount)}
          />
        ) : undefined
      }
    />
  );
}
