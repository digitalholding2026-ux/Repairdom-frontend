import Link from 'next/link';
import { Icon } from '@/components/ui/icon';

export function UpcomingBanner() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-card">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon name="plus" size="md" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Recharger mon solde</p>
        <p className="text-xs text-muted-foreground">
          Paiement mobile money (MTN, Orange) via SasPay.
        </p>
      </div>
      <Link
        href="/client/solde/recharger"
        className="shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-2xs font-semibold text-primary-foreground"
      >
        Recharger
      </Link>
    </div>
  );
}
