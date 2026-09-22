import { RewardProgressCard } from '@/components/ui/reward-progress-card';

const REWARD_TARGET = 5;

export function RewardsCard({ completedCount }: { completedCount: number }) {
  const remaining = Math.max(REWARD_TARGET - completedCount, 0);
  const unlocked = completedCount >= REWARD_TARGET;

  return (
    <RewardProgressCard
      href="/client/recompenses"
      eyebrow="Mes récompenses"
      completedCount={completedCount}
      target={REWARD_TARGET}
      unit="dépannages terminés"
      icon="sparkles"
      message={
        unlocked
          ? 'Récompense débloquée, bravo !'
          : remaining === 1
            ? 'Plus qu\u20191 dépannage pour ta récompense !'
            : `Plus que ${remaining} dépannages pour ta récompense !`
      }
    />
  );
}
