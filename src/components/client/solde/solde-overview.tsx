import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
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
  // Fonds engagés (holds ACTIFS sur devis acceptés) = brut validé − disponible.
  const engaged = Math.max(0, summary.totals.credit - summary.totals.debit - summary.balance);
  // Recharges créditées sur le mois civil en cours.
  const now = new Date();
  const topupsThisMonth = summary.transactions
    .filter((t) => t.type === 'CLIENT_TOPUP' && t.direction === 'CREDIT')
    .filter((t) => {
      const created = new Date(t.createdAt);
      return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
    })
    .reduce((acc, t) => acc + t.amount, 0);

  return (
    <GradientHeroCard>
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-white/70">
            Solde disponible
          </p>
          <p className="figure mt-1.5 text-3xl font-bold tabular-nums text-white lg:text-4xl">
            {formatCurrency(summary.balance, summary.currency)}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/70">
            <Icon name="shield-check" size="3.5" />
            Solde disponible sous protection SasPay
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/20 text-white shadow-float">
            <Icon name="briefcase" size="lg" />
          </span>
        </div>
      </div>

      <div className="relative mt-3 flex gap-2">
        <Link href="/client/solde/recharger" className="flex-1">
          <Button
            variant="outline"
            className="w-full border-none bg-white font-semibold text-slate-900 shadow-sm hover:bg-slate-100"
          >
            <Icon name="plus" size="sm" />
            Recharger
          </Button>
        </Link>
        {onWithdraw ? (
          <Button
            variant="ghost"
            onClick={onWithdraw}
            className="flex-1 border border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
          >
            <Icon name="wallet" size="sm" />
            Retirer
          </Button>
        ) : null}
      </div>

      <div className="relative mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
        <HeroStat label="En attente / Engagé" value={formatCurrency(engaged, summary.currency)} />
        <HeroStat label="Recharges ce mois" value={formatCurrency(topupsThisMonth, summary.currency)} />
        <HeroStat label="Remboursements reçus" value={formatCurrency(totalRefunds, summary.currency)} />
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
