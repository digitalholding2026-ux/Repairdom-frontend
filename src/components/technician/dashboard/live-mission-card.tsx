import { Icon } from '@/components/ui/icon';
import { DemandeStatusBadge } from '@/components/ui/status-badge';
import type { TechnicianDemande } from '@/lib/api/technician-service';
import { formatDate, fullName, initials } from '@/lib/format';
import { LiveMissionCard as SharedLiveMissionCard } from '@/components/mission/mission-card';

export function TechnicianLiveMissionCard({ mission }: { mission: TechnicianDemande }) {
  const client = mission.client;
  return (
    <SharedLiveMissionCard
      href={`/technicien/demandes/${mission.id}`}
      badge={<DemandeStatusBadge status={mission.status} context="technician" />}
      categoryLabel={mission.categoryLabel}
      reference={mission.reference}
      description={mission.description}
      status={mission.status}
      requestedMode={mission.requestedMode}
      requestedAt={mission.requestedAt}
      personAvatar={
        client ? initials(client.firstName, client.lastName) : <Icon name="users" size="sm" />
      }
      personName={client ? fullName(client.firstName, client.lastName) : 'En attente du client'}
      personSub={client ? `Client · ${formatDate(mission.createdAt)}` : mission.city}
    />
  );
}
