import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { GradientHeroCard, HeroStat } from '@/components/ui/gradient-hero-card';
import { formatCurrency } from '@/lib/format';
import type { ClientFinanceSummary } from '@/lib/api/finance-service';

export function SoldeOverview({
  summary,
  onWithdraw,
}: {
  summary: ClientFinanceSummary;
  onWithdraw?: () => void;
}) {
  const totalRefunds = summary.missions
    .filter((m) => m.refunded)
    .reduce((acc, m) => acc + (m.refundAmount || 0), 0);

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

      <div className="relative mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <HeroStat label="Disponible" value={formatCurrency(summary.balance, summary.currency)} />
        <HeroStat label="Débité" value={formatCurrency(summary.totals.debit, summary.currency)} />
        <HeroStat label="Remboursements" value={formatCurrency(totalRefunds, summary.currency)} />
      </div>

      <div className="relative mt-3 flex gap-2">
        <Link
          href="/client/solde/recharger"
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-primary transition active:scale-[0.98]"
        >
          <Icon name="plus" size="sm" />
          Recharger
        </Link>
        {onWithdraw ? (
          <button
            type="button"
            onClick={onWithdraw}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/50 bg-white/10 text-sm font-semibold text-white transition active:scale-[0.98]"
          >
            <Icon name="wallet" size="sm" />
            Retirer
          </button>
        ) : null}
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
