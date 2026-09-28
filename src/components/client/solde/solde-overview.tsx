import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
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

  const stats = [
    { label: 'En attente / Engagé', value: formatCurrency(engaged, summary.currency) },
    { label: 'Recharges ce mois', value: formatCurrency(topupsThisMonth, summary.currency) },
    { label: 'Remboursements', value: formatCurrency(totalRefunds, summary.currency) },
  ];

  return (
    <section
      aria-label="Solde disponible"
      className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-6 text-white shadow-xl"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Solde disponible
        </p>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
          <Icon name="shield-check" size="3.5" />
          SasPay
        </span>
      </div>

      <p className="truncate text-4xl font-extrabold tabular-nums tracking-tight text-orange-500">
        {formatCurrency(summary.balance, summary.currency)}
      </p>

      <div className="flex gap-2">
        <Link href="/client/solde/recharger" className="flex-1">
          <span className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 font-bold text-white shadow-md shadow-orange-500/20 transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 active:scale-[0.98]">
            <Icon name="plus" size="sm" strokeWidth={2.4} />
            Recharger
          </span>
        </Link>
        {onWithdraw ? (
          <button
            type="button"
            onClick={onWithdraw}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 py-3 font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 active:scale-[0.98]"
          >
            <Icon name="wallet" size="sm" />
            Retirer
          </button>
        ) : null}
      </div>

      <dl className="grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0 text-center">
            <dt className="text-[11px] font-medium leading-tight text-slate-400">{stat.label}</dt>
            <dd className="mt-1 truncate text-sm font-bold tabular-nums text-white">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
