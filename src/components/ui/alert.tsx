import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './icon';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error' | 'neutral';

const styles: Record<AlertVariant, string> = {
  info: 'border-info-border bg-info-soft text-info-ink',
  success: 'border-success-border bg-success-soft text-success-ink',
  warning: 'border-warning-border bg-warning-soft text-warning-ink',
  error: 'border-error-border bg-error-soft text-error-ink',
  neutral: 'border-border bg-muted text-foreground',
};

const iconByVariant: Record<AlertVariant, IconName | null> = {
  info: 'info',
  success: 'check-circle',
  warning: 'alert',
  error: 'alert',
  neutral: null,
};

export interface AlertProps {
  variant?: AlertVariant;
  title?: ReactNode;
  icon?: IconName | null;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  dense?: boolean;
}

export function Alert({
  variant = 'info',
  title,
  icon,
  action,
  children,
  className,
  dense = false,
}: AlertProps) {
  const iconName = icon === undefined ? iconByVariant[variant] : icon;
  return (
    <div
      role={variant === 'error' ? 'alert' : undefined}
      className={cn(
        'flex items-start gap-3 rounded-lg border',
        dense ? 'px-3 py-2.5' : 'px-3.5 py-3',
        styles[variant],
        className,
      )}
    >
      {iconName ? (
        <span aria-hidden className="mt-0.5 shrink-0">
          <Icon name={iconName} size="md" filled={variant === 'success'} />
        </span>
      ) : null}
      <div className="min-w-0 flex-1 space-y-0.5">
        {title ? <p className="text-sm font-medium">{title}</p> : null}
        {children ? <div className="text-sm opacity-90">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}