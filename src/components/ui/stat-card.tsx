import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/icon';
import { cn } from '@/lib/cn';

export interface StatCardProps {
  icon: IconName;
  label: string;
  value: number | string;
  href?: string;
  variant?: 'default' | 'revenue';
  trend?: { value: number; label: string };
  className?: string;
}

export function StatCard({
  icon,
  label,
  value,
  href,
  variant = 'default',
  trend,
  className,
}: StatCardProps) {
  const content = (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-3 text-center shadow-card',
        href && 'transition-colors hover:bg-muted/50',
        className,
      )}
    >
      <span
        className={cn(
          'mx-auto mb-1.5 flex size-8 items-center justify-center rounded-lg',
          variant === 'revenue'
            ? 'bg-success-soft text-success-ink'
            : 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200',
        )}
      >
        <Icon name={icon} size="sm" />
      </span>
      <p
        className={cn(
          'text-xl font-bold leading-none tracking-tight',
          variant === 'revenue' && 'text-success-ink',
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      {trend ? (
        <span
          className={cn(
            'mt-1 inline-flex items-center gap-0.5 text-2xs font-medium',
            trend.value >= 0 ? 'text-success-ink' : 'text-error-ink',
          )}
        >
          <Icon
            name={trend.value >= 0 ? 'chevron-right' : 'chevron-left'}
            size="3.5"
            className={trend.value >= 0 ? 'rotate-90' : '-rotate-90'}
          />
          {Math.abs(trend.value)}% {trend.label}
        </span>
      ) : null}
    </div>
  );

  return href ? <Link href={href} className="block">{content}</Link> : content;
}
