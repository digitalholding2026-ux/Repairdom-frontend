import { Icon } from '@/components/ui/icon';
import { DemandeStatusBadge } from '@/components/ui/status-badge';
import { formatDate, fullName, initials } from '@/lib/format';
import { LiveMissionCard as SharedLiveMissionCard } from '@/components/mission/mission-card';
import type { RecentItem } from './use-client-dashboard-data';

/* Carte d'intervention en cours, côté client.
 *
 * CE COMPOSANT ÉTAIT MORT
 * Il n'était importé par aucun fichier : le composant partagé qu'il enveloppe
 * (`mission/mission-card.tsx`) avait été factorisé, le wrapper avait suivi —
 * puis plus rien ne l'utilisait. Le client voyait donc ses interventions en
 * cours dans une simple liste triée par date, sans jamais voir « votre
 * technicien est en route » comme un bloc à part entière.
 *
 * Il est réactivé par le chantier hiérarchie. Le type a changé : il consomme
 * `RecentItem` — la forme dérivée par la couche données — plutôt que la
 * forme brute renvoyée par l'API. Le composant n'en faisait pas plus, et
 * fabriquer un objet conforme à l'ancienne signature juste pour appeler une
 * fonction aurait été un mensonge de type. */
export function LiveMissionCard({ mission }: { mission: RecentItem }) {
  const { technician } = mission;
  return (
    <SharedLiveMissionCard
      href={mission.href}
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