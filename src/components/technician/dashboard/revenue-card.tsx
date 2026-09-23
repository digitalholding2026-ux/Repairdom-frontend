import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { GradientHeroCard, HeroStat } from '@/components/ui/gradient-hero-card';
import { formatCurrency } from '@/lib/format';
import type { TechnicianFinanceSummary } from '@/lib/api/finance-service';

export interface RevenueCardProps {
  finance: TechnicianFinanceSummary | null;
  completedToday: number;
}

export function RevenueCard({ finance, completedToday }: RevenueCardProps) {
  const net = finance?.netRevenue ?? 0;
  const available = finance?.available ?? 0;
  const missionCount = finance?.missions?.length ?? 0;

  return (
    <Link href="/technicien/revenus" className="block active:scale-[0.99] transition-transform">
      <GradientHeroCard tone="primary">
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-white/70">
              Mes revenus
            </p>
            <p className="figure mt-1.5 text-3xl font-bold tracking-tight">
              {formatCurrency(net)}
            </p>
            <p className="mt-0.5 text-xs text-white/70">
              {missionCount} mission{missionCount !== 1 ? 's' : ''} au total
            </p>
          </div>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white shadow-float">
            <Icon name="briefcase" size="lg" />
          </span>
        </div>

        <div className="relative mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <HeroStat label="Disponible" value={formatCurrency(available)} />
          <HeroStat
            label="Aujourd'hui"
            value={`${completedToday} dépannage${completedToday !== 1 ? 's' : ''}`}
          />
        </div>

        <div className="relative mt-3 flex items-center justify-end gap-1 text-xs font-medium text-white/80">
          Voir les revenus
          <Icon name="chevron-right" size="sm" />
        </div>
      </GradientHeroCard>
    </Link>
  );
}
