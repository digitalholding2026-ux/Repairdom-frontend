import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/cn';
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
      <div
        className={cn(
          'relative overflow-hidden rounded-3xl p-5 text-white shadow-pop',
          'bg-gradient-to-br from-primary via-indigo-600 to-violet-600',
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-14 size-40 rounded-full bg-white/15 blur-2xl"
        />
        <div
          aria-hidden
          className="animate-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/30" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-white/70">
              Mes revenus
            </p>
            <p className="mt-1.5 font-mono text-3xl font-bold tracking-tight">
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

        <div className="relative mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-white/15 px-3 py-2 backdrop-blur-sm">
            <p className="text-[0.65rem] font-medium uppercase tracking-wider text-white/60">
              Disponible
            </p>
            <p className="font-mono text-base font-bold">{formatCurrency(available)}</p>
          </div>
          <div className="rounded-xl bg-white/15 px-3 py-2 backdrop-blur-sm">
            <p className="text-[0.65rem] font-medium uppercase tracking-wider text-white/60">
              Aujourd&apos;hui
            </p>
            <p className="font-mono text-base font-bold">
              {completedToday} dépannage{completedToday !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="relative mt-3 flex items-center justify-end gap-1 text-xs font-medium text-white/80">
          Voir les revenus
          <Icon name="chevron-right" size="sm" />
        </div>
      </div>
    </Link>
  );
}
