import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { formatCurrency } from '@/lib/format';
import type { ClientFinanceSummary } from '@/lib/api/finance-service';

export function SoldeOverview({ summary }: { summary: ClientFinanceSummary }) {
  const simulation = summary.mode === 'SIMULATION';
  const totalRefunds = summary.missions
    .filter((m) => m.refunded)
    .reduce((acc, m) => acc + (m.refundAmount || 0), 0);
  const totalFees = summary.missions.reduce((acc, m) => acc + m.fee, 0);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-gradient-from via-brand-gradient-via to-brand-gradient-to p-5 text-white shadow-pop">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-14 size-40 rounded-full bg-white/15 blur-2xl"
      />
      <div
        aria-hidden
        className="animate-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/30"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-white/70">
            Solde disponible
          </p>
          <p className="mt-1.5 font-mono text-3xl font-bold tracking-tight">
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
          {simulation ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-300/20 px-2.5 py-1 text-xs font-semibold text-amber-200">
              <Icon name="sparkles" size="3.5" />
              Simulation
            </span>
          ) : null}
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl bg-white/15 px-3 py-2 backdrop-blur-sm">
          <p className="text-[0.65rem] font-medium uppercase tracking-wider text-white/60">
            Crédits reçus
          </p>
          <p className="font-mono text-base font-bold">
            {formatCurrency(summary.totals.credit, summary.currency)}
          </p>
        </div>
        <div className="rounded-xl bg-white/15 px-3 py-2 backdrop-blur-sm">
          <p className="text-[0.65rem] font-medium uppercase tracking-wider text-white/60">
            Débits
          </p>
          <p className="font-mono text-base font-bold">
            {formatCurrency(summary.totals.debit, summary.currency)}
          </p>
        </div>
        <div className="rounded-xl bg-white/15 px-3 py-2 backdrop-blur-sm">
          <p className="text-[0.65rem] font-medium uppercase tracking-wider text-white/60">
            Remboursements
          </p>
          <p className="font-mono text-base font-bold">
            {formatCurrency(totalRefunds, summary.currency)}
          </p>
        </div>
        <div className="rounded-xl bg-white/15 px-3 py-2 backdrop-blur-sm">
          <p className="text-[0.65rem] font-medium uppercase tracking-wider text-white/60">
            Frais Relio
          </p>
          <p className="font-mono text-base font-bold text-white/85">
            {formatCurrency(totalFees, summary.currency)}
          </p>
        </div>
      </div>

      <Link
        href="#mouvements"
        className="relative mt-3 flex items-center justify-end gap-1 text-xs font-medium text-white/80"
      >
        Voir le détail des mouvements
        <Icon name="chevron-right" size="sm" />
      </Link>
    </div>
  );
}