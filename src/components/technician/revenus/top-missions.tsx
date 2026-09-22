import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { TechnicianMissionFinance } from '@/lib/api/finance-service';

/* Médailles tokenisées (or/argent/bronze) : lisibles en mode sombre,
 * contrairement aux amber/slate/orange en dur. */
const RANK_STYLES = [
  'bg-warning text-warning-foreground',
  'bg-muted text-muted-foreground',
  'bg-warning-soft text-warning-ink',
];

export function TopMissions({
  missions,
  currency,
}: {
  missions: TechnicianMissionFinance[];
  currency: string;
}) {
  const top = [...missions].sort((a, b) => b.net - a.net).slice(0, 3);

  if (missions.length < 2) return null;

  return (
    <div className="space-y-2">
      {top.map((m, i) => (
        <Link key={m.demandeId} href={`/technicien/demandes/${m.demandeId}`} className="block">
          <Card className="transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-3 p-3">
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  RANK_STYLES[i] ?? RANK_STYLES[2],
                )}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm font-semibold text-primary">{m.reference}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatCurrency(m.repair + m.travel, currency)} · réglée
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-success-ink">
                {formatCurrency(m.net, currency)}
              </span>
              <Icon name="chevron-right" size="sm" className="shrink-0 text-muted-foreground" />
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}