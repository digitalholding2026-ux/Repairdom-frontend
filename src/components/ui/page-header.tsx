import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './icon';

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  className?: string;
}

export function PageHeader({ title, description, actions, backHref, className }: PageHeaderProps) {
  return (
    <header className={cn('space-y-4', className)}>
      {backHref ? (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <Icon name="arrow-left" size="sm" />
          Retour
        </Link>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="break-words text-xl font-bold leading-tight tracking-tight sm:text-2xl">
            {title}
          </h1>
          {description ? <p className="break-words text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export interface SectionHeaderProps {
  title: ReactNode;
  action?: ReactNode;
  description?: ReactNode;
  icon?: IconName;
  className?: string;
}

export function SectionHeader({ title, action, description, icon, className }: SectionHeaderProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg">
          {icon ? (
            <Icon name={icon} size="sm" className="text-muted-foreground" />
          ) : null}
          {title}
        </h2>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}