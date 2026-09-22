import Link from 'next/link';
import { Icon, type IconName } from './icon';

/* Phase B — carte de progression gamification unique : unifie RewardsCard
 * (client, objectif 5) et InterventionsCard (technicien, palier 10).
 * Dégradé tokenisé `.reward-gradient` (sombre-compatible), commun aux deux. */

export interface RewardProgressCardProps {
  href: string;
  eyebrow: string;
  completedCount: number;
  target: number;
  unit: string;
  icon: IconName;
  message: string;
}

export function RewardProgressCard({
  href,
  eyebrow,
  completedCount,
  target,
  unit,
  icon,
  message,
}: RewardProgressCardProps) {
  const progress = Math.min(completedCount / target, 1);
  return (
    <Link href={href} className="block active:scale-[0.99] transition-transform">
      <div className="reward-gradient relative overflow-hidden rounded-3xl p-5 text-white shadow-float">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-8 -top-10 size-36 rounded-full bg-white/20 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-12 -right-6 size-32 rounded-full bg-white/20 blur-2xl"
        />

        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-white/80">{eyebrow}</p>
            <p className="mt-1.5 font-mono text-3xl font-bold tracking-tight">
              {completedCount} <span className="text-lg text-white/70">/ {target}</span>
            </p>
            <p className="mt-0.5 text-xs text-white/80">{unit}</p>
          </div>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white shadow-float">
            <Icon name={icon} size="lg" />
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
          <p className="text-xs font-medium">{message}</p>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold">
            Voir
            <Icon name="chevron-right" size="sm" />
          </span>
        </div>
      </div>
    </Link>
  );
}
