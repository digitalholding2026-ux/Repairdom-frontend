import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import type { TechnicianDemande } from '@/lib/api/technician-service';
import { formatTime, fullName } from '@/lib/format';

export interface DaySummaryProps {
  activeMissions: TechnicianDemande[];
  completedToday: number;
}

export function DaySummary({ activeMissions, completedToday }: DaySummaryProps) {
  const scheduled = activeMissions.filter((m) => m.scheduledAt);
  const asap = activeMissions.filter((m) => !m.scheduledAt);
  const hasContent = scheduled.length > 0 || asap.length > 0 || completedToday > 0;

  if (!hasContent) return null;

  return (
    <div className="space-y-2.5">
      {scheduled.length > 0 ? (
        <div className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Icon name="calendar" size="3.5" />
            Planifiées
          </h3>
          {scheduled.map((m) => (
            <Link key={m.id} href={`/technicien/demandes/${m.id}`} className="block">
              <Card className="transition-colors hover:bg-muted/50">
                <div className="flex items-center gap-3 p-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon name="calendar" size="sm" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.categoryLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.scheduledAt ? formatTime(m.scheduledAt) : ''}
                      {m.client ? ` · ${fullName(m.client.firstName, m.client.lastName)}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-primary">
                    {m.reference}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}

      {asap.length > 0 ? (
        <div className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Icon name="zap" size="3.5" />
            En attente
          </h3>
          {asap.map((m) => (
            <Link key={m.id} href={`/technicien/demandes/${m.id}`} className="block">
              <Card className="transition-colors hover:bg-muted/50">
                <div className="flex items-center gap-3 p-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning-ink">
                    <Icon name="clock" size="sm" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.categoryLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      Dès que possible
                      {m.client ? ` · ${fullName(m.client.firstName, m.client.lastName)}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-primary">
                    {m.reference}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}

      {completedToday > 0 ? (
        <div className="flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2 text-sm text-success-ink">
          <Icon name="check-circle" size="sm" />
          <span className="font-medium">
            {completedToday} intervention{completedToday !== 1 ? 's' : ''} terminée
            {completedToday !== 1 ? 's' : ''} aujourd&apos;hui
          </span>
        </div>
      ) : null}
    </div>
  );
}
