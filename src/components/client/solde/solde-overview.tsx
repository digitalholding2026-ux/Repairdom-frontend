import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { GradientHeroCard, HeroStat } from '@/components/ui/gradient-hero-card';
import { formatCurrency } from '@/lib/format';
import type { ClientFinanceSummary } from '@/lib/api/finance-service';

export function SoldeOverview({ summary }: { summary: ClientFinanceSummary }) {
  const totalRefunds = summary.missions
    .filter((m) => m.refunded)
    .reduce((acc, m) => acc + (m.refundAmount || 0), 0);
  const totalFees = summary.missions.reduce((acc, m) => acc + m.fee, 0);

  return (
    <GradientHeroCard>
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-white/70">
            Solde disponible
          </p>
          <p className="figure mt-1.5 text-3xl font-bold tracking-tight">
            {formatCurrency(summary.balance, summary.currency)}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/70">
            <Icon name="shield-check" size="3.5" />
            Paiement sécurisé · bonus inclus
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/20 text-white shadow-float">
            <Icon name="briefcase" size="lg" />
          </span>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <HeroStat label="Crédits reçus" value={formatCurrency(summary.totals.credit, summary.currency)} />
        <HeroStat label="Débits" value={formatCurrency(summary.totals.debit, summary.currency)} />
        <HeroStat label="Remboursements" value={formatCurrency(totalRefunds, summary.currency)} />
        <HeroStat label="Frais Relio" value={formatCurrency(totalFees, summary.currency)} muted />
      </div>

      <Link
        href="#mouvements"
        className="relative mt-3 flex items-center justify-end gap-1 text-xs font-medium text-white/80"
      >
        Voir le détail des mouvements
        <Icon name="chevron-right" size="sm" />
      </Link>
    </GradientHeroCard>
  );
}
