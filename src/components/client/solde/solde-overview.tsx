import { Icon } from '@/components/ui/icon';
import { formatCurrency } from '@/lib/format';
import type { ClientFinanceSummary } from '@/lib/api/finance-service';

export function SoldeOverview({
  summary,
}: {
  summary: ClientFinanceSummary;
}) {
  // Fonds engagés (holds ACTIVE sur devis acceptés) = montant bloqué en garantie.
  const held = summary.heldAmount;

  return (
    <section
      aria-label="Solde disponible"
      className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-6 text-white shadow-xl"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Montant bloqué en garantie
        </p>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
          <Icon name="shield-check" size="3.5" />
          Garantie
        </span>
      </div>

      <p className="truncate text-4xl font-extrabold tabular-nums tracking-tight text-orange-500">
        {formatCurrency(held, summary.currency)}
      </p>

      <dl className="grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
        <div className="min-w-0 text-center">
          <dt className="text-[11px] font-medium leading-tight text-slate-400">En garantie</dt>
          <dd className="mt-1 truncate text-sm font-bold tabular-nums text-white">
            {formatCurrency(held, summary.currency)}
          </dd>
        </div>
        <div className="min-w-0 text-center">
          <dt className="text-[11px] font-medium leading-tight text-slate-400">Remboursement</dt>
          <dd className="mt-1 truncate text-sm font-bold tabular-nums text-white">
            {formatCurrency(summary.balance - held, summary.currency)}
          </dd>
        </div>
        <div className="min-w-0 text-center">
          <dt className="text-[11px] font-medium leading-tight text-slate-400">Solde total</dt>
          <dd className="mt-1 truncate text-sm font-bold tabular-nums text-white">
            {formatCurrency(summary.balance, summary.currency)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
