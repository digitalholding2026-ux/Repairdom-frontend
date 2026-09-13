import Link from 'next/link';
import { Icon } from '@/components/ui/icon';

const REWARD_TARGET = 5;

export function RewardsCard({ completedCount }: { completedCount: number }) {
  const progress = Math.min(completedCount / REWARD_TARGET, 1);
  const remaining = Math.max(REWARD_TARGET - completedCount, 0);
  const unlocked = completedCount >= REWARD_TARGET;

  return (
    <Link href="/client/recompenses" className="block active:scale-[0.99] transition-transform">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-orange-600 p-5 text-white shadow-float">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-8 -top-10 size-36 rounded-full bg-white/20 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-12 -right-6 size-32 rounded-full bg-amber-200/25 blur-2xl"
        />

        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-white/80">
              Mes récompenses
            </p>
            <p className="mt-1.5 font-mono text-3xl font-bold tracking-tight">
              {completedCount} <span className="text-lg text-white/70">/ {REWARD_TARGET}</span>
            </p>
            <p className="mt-0.5 text-xs text-white/80">dépannages terminés</p>
          </div>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white shadow-float">
            <Icon name="sparkles" size="lg" />
          </span>
        </div>

        <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-white/25">
          <div
            className="animate-stripes h-full rounded-full bg-white transition-all duration-1000"
            style={{
              width: `${Math.round(progress * 100)}%`,
              backgroundImage:
                'repeating-linear-gradient(45deg, rgb(255 255 255 / 0.45) 0 6px, transparent 6px 12px)',
            }}
          />
        </div>

        <div className="relative mt-3 flex items-center justify-between gap-3">
          <p className="text-xs font-medium">
            {unlocked
              ? 'Récompense débloquée, bravo !'
              : remaining === 1
                ? 'Plus qu\u20191 dépannage pour ta récompense !'
                : `Plus que ${remaining} dépannages pour ta récompense !`}
          </p>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold">
            Voir
            <Icon name="chevron-right" size="sm" />
          </span>
        </div>
      </div>
    </Link>
  );
}