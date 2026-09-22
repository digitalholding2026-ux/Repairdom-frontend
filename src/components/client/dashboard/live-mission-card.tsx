import { Icon } from '@/components/ui/icon';
import { DemandeStatusBadge } from '@/components/ui/status-badge';
import type { DemandeListItem } from '@/lib/api/request-service';
import { formatDate, fullName, initials } from '@/lib/format';
import { LiveMissionCard as SharedLiveMissionCard } from '@/components/mission/mission-card';

export function LiveMissionCard({ mission }: { mission: DemandeListItem }) {
  const technician = mission.technician;
  return (
    <SharedLiveMissionCard
      href={`/client/demandes/${mission.id}`}
      badge={<DemandeStatusBadge status={mission.status} />}
      categoryLabel={mission.categoryLabel}
      reference={mission.reference}
      description={mission.description}
      status={mission.status}
      requestedMode={mission.requestedMode}
      requestedAt={mission.requestedAt}
      personAvatar={
        technician ? (
          initials(technician.firstName, technician.lastName)
        ) : (
          <Icon name="users" size="sm" />
        )
      }
      personName={
        technician ? fullName(technician.firstName, technician.lastName) : 'Recherche du technicien…'
      }
      personSub={
        technician
          ? `Intervention · ${formatDate(mission.createdAt)}`
          : 'Techniciens vérifiés à proximité'
      }
    />
  );
}
