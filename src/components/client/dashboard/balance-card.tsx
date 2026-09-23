import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { GradientHeroCard, HeroStat } from '@/components/ui/gradient-hero-card';
import { SimulationBadge } from '@/components/ui/simulation-badge';
import type { ClientFinanceSummary } from '@/lib/api/finance-service';
import { formatCurrency } from '@/lib/format';

export function BalanceCard({ balance }: { balance: ClientFinanceSummary }) {
  return (
    <Link href="/client/solde" className="block active:scale-[0.99] transition-transform">
      <GradientHeroCard>
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-white/70">
              Solde disponible
            </p>
            <p className="figure mt-1 text-3xl font-bold tracking-tight">
              {formatCurrency(balance.balance, balance.currency)}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/70">
              <Icon name="shield-check" size="3.5" />
              Paiement sécurisé · bonus inclus
            </p>
          </div>
          {balance.mode === 'SIMULATION' ? <SimulationBadge /> : null}
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-2.5">
          <HeroStat
            label="Crédits reçus"
            value={formatCurrency(balance.totals.credit, balance.currency)}
          />
          <HeroStat label="Débits" value={formatCurrency(balance.totals.debit, balance.currency)} />
        </div>

        <div className="relative mt-3 flex items-center justify-end gap-1 text-xs font-medium text-white/80">
          Voir mon solde
          <Icon name="chevron-right" size="sm" />
        </div>
      </GradientHeroCard>
    </Link>
  );
}
