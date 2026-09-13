import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/icon';
import { Avatar } from '@/components/ui/avatar';
import { initials } from '@/lib/format';

export interface TrackingHeroTechnician {
  firstName?: string | null;
  lastName?: string | null;
  label?: string;
  verified?: boolean;
}

export interface TrackingHeroProps {
  badge: ReactNode;
  reference: string;
  title: string;
  subtitle?: string;
  progress: number;
  live: boolean;
  canceled?: boolean;
  statusLabel: string;
  technician?: TrackingHeroTechnician | null;
  href?: string;
}

const LIVE_GRADIENT =
  'from-primary/70 via-accent/60 to-emerald-500/60';
const DONE_GRADIENT =
  'from-emerald-400/70 via-emerald-500 to-teal-500/70';
const CANCELED_GRADIENT =
  'from-slate-400/70 via-slate-400/50 to-slate-500/70';

/** Carte « suivi en direct » façon Uber Eats : barre segmentée avec l'avatar
 *  du technicien qui avance au fil de la progression, statut en direct. */
export function TrackingHero({
  badge,
  reference,
  title,
  subtitle,
  progress,
  live,
  canceled = false,
  statusLabel,
  technician,
  href,
}: TrackingHeroProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const rounded = Math.round(clampedProgress);
  const technicianName = technician ? initials(technician.firstName, technician.lastName) : null;

  const content = (
    <div
      className={cn(
        'rounded-[1.5rem] bg-gradient-to-br p-px shadow-float transition-colors duration-700',
        canceled ? CANCELED_GRADIENT : live ? LIVE_GRADIENT : DONE_GRADIENT,
      )}
    >
      <div className={cn('relative overflow-hidden rounded-[calc(1.5rem-1px)] bg-card p-5')}>
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute -right-20 -top-20 size-52 rounded-full blur-3xl',
            canceled
              ? 'bg-slate-400/10'
              : live
                ? 'bg-primary/10'
                : 'bg-emerald-400/10',
          )}
        />

        <div className="relative flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {canceled ? (
              <span className="flex size-2.5 rounded-full bg-slate-400" />
            ) : !live ? (
              <span className="flex size-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-400/30" />
            ) : (
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
              </span>
            )}
            <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {canceled ? 'Mission annulée' : live ? 'Suivi en direct' : 'Mission terminée'}
            </p>
          </div>
          {badge}
        </div>

        <div className="relative mt-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs font-semibold tracking-wide text-primary">{reference}</p>
            <h2 className="mt-1 truncate text-xl font-bold tracking-tight">{title}</h2>
            {subtitle ? <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          <p className="shrink-0 text-3xl font-extrabold tabular-nums tracking-tight">
            {rounded}
            <span className="text-sm font-semibold text-muted-foreground">%</span>
          </p>
        </div>

        <div className={cn('relative mt-5', canceled && 'opacity-40 saturate-0')}>
          <div className="flex h-2.5 w-full gap-1">
            {Array.from({ length: 5 }).map((_, segment) => {
              const threshold = ((segment + 1) / 5) * 100;
              const filled = clampedProgress >= threshold - 0.01 || (segment === 0 && clampedProgress > 0);
              return (
                <span
                  key={segment}
                  className={cn(
                    'h-full flex-1 rounded-full transition-colors duration-500',
                    filled ? (canceled ? 'bg-slate-400' : 'bg-gradient-to-r from-primary to-accent') : 'bg-muted',
                  )}
                />
              );
            })}
          </div>
          {!canceled ? (
            <span
              aria-hidden
              className="absolute -top-[9px] flex size-7 items-center justify-center rounded-full border-2 border-background bg-white text-primary shadow-pop transition-[left] duration-1000 ease-out"
              style={{ left: `calc(${clampedProgress}% - 14px)` }}
            >
              {technicianName ? (
                <span className="text-[10px] font-extrabold">{technicianName}</span>
              ) : (
                <Icon name="users" size="sm" />
              )}
            </span>
          ) : null}
        </div>

        <div className="relative mt-5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 max-w-full items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2">
            <Avatar
              size="sm"
              firstName={technician?.firstName ?? ''}
              lastName={technician?.lastName ?? null}
              online={Boolean(technician?.verified)}
            />
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-sm font-medium">
                <span className="truncate">{technician?.label ?? 'Recherche du technicien…'}</span>
                {technician?.verified ? <Icon name="badge-check" size="3.5" className="shrink-0 text-success" /> : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {technician?.verified ? 'Technicien vérifié' : 'En attente d’une affectation'}
              </p>
            </div>
          </div>
          <p className="ml-auto inline-flex min-w-0 items-center gap-1 text-xs font-medium text-muted-foreground">
            <Icon name="clock" size="3.5" className="shrink-0" />
            <span className="truncate">{statusLabel}</span>
          </p>
        </div>
      </div>
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}