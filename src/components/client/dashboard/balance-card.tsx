import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import type { ClientFinanceSummary } from '@/lib/api/finance-service';
import { formatCurrency } from '@/lib/format';

export function BalanceCard({ balance }: { balance: ClientFinanceSummary }) {
  return (
    <Link href="/client/solde" className="block active:scale-[0.99] transition-transform">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#4f46e5] via-[#6d28d9] to-[#8b5cf6] p-5 text-white shadow-pop">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-14 size-40 rounded-full bg-white/20 blur-2xl"
        />
        <div
          aria-hidden
          className="animate-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/40"
        />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-white/70">
              Solde disponible
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight">
              {formatCurrency(balance.balance, balance.currency)}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/70">
              <Icon name="shield-check" size="3.5" />
              Paiement sécurisé · bonus inclus
            </p>
          </div>
          {balance.mode === 'SIMULATION' ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-300/20 px-2.5 py-1 text-xs font-semibold text-amber-200">
              <Icon name="sparkles" size="3.5" />
              Simulation
            </span>
          ) : null}
        </div>

        <div className="mt-5 flex gap-2.5">
          <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/15 py-2.5 text-sm font-medium backdrop-blur-sm">
            <Icon name="plus" size="sm" />
            Recharger
          </span>
          <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/15 py-2.5 text-sm font-medium backdrop-blur-sm">
            Retirer
          </span>
        </div>
      </div>
    </Link>
  );
}