import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { DemandeStatusBadge } from '@/components/ui/status-badge';
import type { DemandeListItem } from '@/lib/api/request-service';
import { formatRequestedTiming } from '@/lib/request-timing';
import { formatDate, fullName, initials } from '@/lib/format';
import { STATUS_PROGRESS } from '@/lib/mission-progress';

export function LiveMissionCard({ mission }: { mission: DemandeListItem }) {
  const progress = STATUS_PROGRESS[mission.status] ?? 15;
  const technician = mission.technician;

  return (
    <Link href={`/client/demandes/${mission.id}`} className="block active:scale-[0.99] transition-transform">
      <div className="rounded-2xl bg-gradient-to-br from-primary/35 via-primary/20 to-accent/35 p-px">
        <div className="relative overflow-hidden rounded-[calc(1rem-1px)] bg-card p-4 shadow-float">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="flex size-2 rounded-full bg-emerald-500">
                <span className="animate-pulse-dot size-full rounded-full bg-emerald-500 ring-2 ring-emerald-400/40" />
              </span>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mission en cours
              </p>
            </div>
            <DemandeStatusBadge status={mission.status} />
          </div>

          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-bold tracking-tight">
                {mission.categoryLabel}
              </p>
              <p className="mt-0.5 font-mono text-xs font-semibold text-primary">
                {mission.reference}
              </p>
            </div>
          </div>

          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{mission.description}</p>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Icon name="clock" size="3.5" />
                {formatRequestedTiming(mission.requestedMode, mission.requestedAt)}
              </span>
              <span className="text-xs font-medium text-foreground">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="animate-stripes h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-1000"
                style={{
                  width: `${progress}%`,
                  backgroundImage:
                    'repeating-linear-gradient(45deg, rgb(255 255 255 / 0.22) 0 6px, transparent 6px 12px)',
                }}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {technician ? initials(technician.firstName, technician.lastName) : <Icon name="users" size="sm" />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {technician ? fullName(technician.firstName, technician.lastName) : 'Recherche du technicien…'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {technician ? `Intervention · ${formatDate(mission.createdAt)}` : 'Techniciens vérifiés à proximité'}
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary">
              Suivre
              <Icon name="chevron-right" size="sm" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}