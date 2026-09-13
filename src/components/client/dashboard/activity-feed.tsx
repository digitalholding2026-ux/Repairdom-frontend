import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/icon';
import { formatCurrencySigned, formatRelative } from '@/lib/format';
import { cn } from '@/lib/cn';

export type ActivityTone = 'primary' | 'success' | 'info' | 'warning';

export interface ActivityItem {
  id: string;
  icon: IconName;
  tone: ActivityTone;
  title: string;
  subtitle?: string;
  amount?: number;
  currency?: string;
  createdAt: string;
  href?: string;
}

const TONE_CLASSES: Record<ActivityTone, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success-soft text-success-ink',
  info: 'bg-info-soft text-info-ink',
  warning: 'bg-warning-soft text-warning-ink',
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Aucune activité pour le moment. Votre prochaine mission apparaîtra ici.
      </p>
    );
  }

  return (
    <ol className="space-y-1">
      {items.map((item) => {
        const row = (
          <li className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-muted/50">
            <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', TONE_CLASSES[item.tone])}>
              <Icon name={item.icon} size="md" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.title}</p>
              {item.subtitle ? (
                <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              {item.amount != null ? (
                <span
                  className={cn(
                    'text-sm font-semibold',
                    item.amount >= 0 ? 'text-success-ink' : 'text-muted-foreground',
                  )}
                >
                  {formatCurrencySigned(item.amount, item.currency)}
                </span>
              ) : null}
              <span className="text-[0.68rem] text-muted-foreground">
                {formatRelative(item.createdAt)}
              </span>
            </div>
          </li>
        );

        return item.href ? (
          <Link key={item.id} href={item.href} className="block">
            {row}
          </Link>
        ) : (
          <div key={item.id}>{row}</div>
        );
      })}
    </ol>
  );
}