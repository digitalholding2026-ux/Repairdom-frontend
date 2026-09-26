import Link from 'next/link';
import { Icon, type IconName } from './icon';

/* Phase B — carte de progression gamification unique : unifie RewardsCard
 * (client, objectif 5) et InterventionsCard (technicien, palier 10).
 * Règle 60-30-10 : fond Bleu Nuit structurel, l'orange ne subsiste qu'en
 * accent (compteur, progression). */

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
      <div className="animate-float-wave-delayed relative overflow-hidden rounded-3xl border border-white/10 bg-[#0F172A]/95 p-5 text-white shadow-float backdrop-blur-sm">
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
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{eyebrow}</p>
            <p className="mt-1.5 font-mono text-3xl font-bold tracking-tight text-relio-orange-bright">
              {completedCount} <span className="text-lg text-slate-400">/ {target}</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-400">{unit}</p>
          </div>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white shadow-float">
            <Icon name={icon} size="lg" />
          </span>
        </div>

        <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-white/25">
          <div
            className="animate-stripes h-full rounded-full bg-relio-orange-bright transition-all duration-1000"
            style={{
              width: `${Math.round(progress * 100)}%`,
              backgroundImage:
                'repeating-linear-gradient(45deg, rgb(255 255 255 / 0.35) 0 6px, transparent 6px 12px)',
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
