import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { ClientFinanceTransaction } from '@/lib/api/finance-service';

const MONTHS_BACK = 5;

interface MonthBucket {
  key: string;
  label: string;
  year: number;
  month: number;
  amount: number;
}

function buildMonthlyDebits(transactions: ClientFinanceTransaction[]): MonthBucket[] {
  const now = new Date();
  const buckets: MonthBucket[] = [];

  for (let i = MONTHS_BACK; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString('fr-FR', { month: 'short' }),
      year: d.getFullYear(),
      month: d.getMonth(),
      amount: 0,
    });
  }

  for (const t of transactions) {
    if (t.status !== 'VALIDATED') continue;
    if (t.direction !== 'DEBIT') continue;
    const d = new Date(t.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    const bucket = buckets.find((b) => b.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (!bucket) continue;
    bucket.amount += t.amount;
  }

  return buckets;
}

export function SpendChart({
  transactions,
  currency,
}: {
  transactions: ClientFinanceTransaction[];
  currency: string;
}) {
  const data = buildMonthlyDebits(transactions);
  const max = Math.max(...data.map((d) => d.amount), 0);
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${now.getMonth()}`;

  if (max <= 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        Aucune dépense validée sur les 6 derniers mois.
      </p>
    );
  }

  return (
    <div className="flex h-32 items-end justify-between gap-2" role="img" aria-label="Évolution mensuelle des dépenses (débits)">
      {data.map((d) => {
        const pct = Math.max((d.amount / max) * 100, 2);
        const isCurrent = d.key === currentKey;
        return (
          <div
            key={d.key}
            className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
            title={`${d.label} ${d.year} · ${formatCurrency(d.amount, currency)}`}
          >
            <div className="flex w-full flex-1 items-end justify-center">
              <div
                className={cn(
                  'w-full max-w-8 rounded-t-md transition-all duration-500',
                  d.amount > 0
                    ? 'bg-gradient-to-t from-reward-via to-reward-from'
                    : 'bg-muted-foreground/20',
                  !isCurrent && d.amount > 0 && 'opacity-70',
                )}
                style={{ height: `${pct}%` }}
              />
            </div>
            <span
              className={cn(
                'text-2xs capitalize',
                isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground',
              )}
            >
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}