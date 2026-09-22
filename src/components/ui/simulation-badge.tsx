import { Icon } from './icon';
import { cn } from '@/lib/cn';

/* Phase B — badge « Simulation » unique (mode simulé du ledger).
 * Remplace les 3 occurrences recodées (balance-card, solde-overview,
 * revenue-overview). Couleurs conservées à l'identique. */
export function SimulationBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-300/20 px-2.5 py-1 text-xs font-semibold text-amber-200',
        className,
      )}
    >
      <Icon name="sparkles" size="3.5" />
      Simulation
    </span>
  );
}
