import { RewardProgressCard } from '@/components/ui/reward-progress-card';

const TARGET = 10;

/** Carte gamification — miroir des récompenses client, côté technicien. */
export function InterventionsCard({ completedCount }: { completedCount: number }) {
  const remaining = Math.max(TARGET - completedCount, 0);

  return (
    <RewardProgressCard
      href="/technicien/historique"
      eyebrow="Mes interventions"
      completedCount={completedCount}
      target={TARGET}
      unit="dépannages terminés"
      icon="badge-check"
      message={
        remaining === 0
          ? 'Palier atteint, bravo !'
          : remaining === 1
            ? 'Plus qu\u20191 dépannage pour le palier !'
            : `Plus que ${remaining} dépannages pour le palier !`
      }
    />
  );
}
