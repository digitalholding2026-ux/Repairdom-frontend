import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { GradientHeroCard, HeroStat } from '@/components/ui/gradient-hero-card';
import { formatCurrency } from '@/lib/format';
import type { TechnicianFinanceSummary } from '@/lib/api/finance-service';

export function RevenueOverview({ summary }: { summary: TechnicianFinanceSummary }) {
  return (
    <GradientHeroCard tone="primary">
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Mes revenus
          </p>
          <p className="figure mt-1.5 text-3xl font-bold tracking-tight text-relio-orange-bright">
            {formatCurrency(summary.netRevenue, summary.currency)}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">Gain net · missions confirmées</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/20 text-white shadow-float">
            <Icon name="briefcase" size="lg" />
          </span>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <HeroStat label="Disponible" value={formatCurrency(summary.available, summary.currency)} />
        <HeroStat
          label="Dont réparation"
          value={formatCurrency(summary.repairRevenue, summary.currency)}
        />
        <HeroStat
          label="Dont déplacement"
          value={formatCurrency(summary.travelRevenue, summary.currency)}
        />
        <HeroStat
          label="Commission Relio (2 %)"
          value={formatCurrency(summary.platformFees, summary.currency)}
          muted
        />
      </div>

      <Link
        href="#ecritures"
        className="relative mt-3 flex items-center justify-end gap-1 text-xs font-medium text-white/80"
      >
        Voir le détail des écritures
        <Icon name="chevron-right" size="sm" />
      </Link>
    </GradientHeroCard>
  );
}
