'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { DemandeStatusBadge } from '@/components/ui/status-badge';
import { PROGRESS_STEPS } from '@/components/mission/demande-progress';
import {
  listMyChronologies,
  type ChronologyMission,
  type ChronologyScope,
} from '@/lib/api/chronologies-service';
import { fullName } from '@/lib/format';
import type { StatusContext } from '@/lib/request-status';

const HISTORY_TITLES: Record<string, string> = {
  CONFIRMED: 'Intervention confirmée',
  CANCELED: 'Mission annulée',
};

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function deviceLabel(mission: ChronologyMission): string {
  return [
    mission.device.domain,
    mission.device.brand,
    mission.device.model,
    mission.device.problem,
  ]
    .filter(Boolean)
    .join(' — ');
}

function MiniProgress({ status }: { status: string }) {
  const index = PROGRESS_STEPS.findIndex((step) => step.statuses.includes(status));
  if (index === -1) return null;
  return (
    <div className="flex items-center gap-1">
      {PROGRESS_STEPS.map((step, i) => (
        <span
          key={step.title}
          className={cn('h-1.5 flex-1 rounded-full', i <= index ? 'bg-primary' : 'bg-border')}
        />
      ))}
    </div>
  );
}

export interface ChronologiesViewProps {
  detailPrefix: string;
  badgeContext: StatusContext;
}

/** Centrale « Chronologies » : onglets En cours / Historique, données
 *  provenant de l'endpoint dédié (événements embarqués, pas de N+1). */
export function ChronologiesView({ detailPrefix, badgeContext }: ChronologiesViewProps) {
  const [scope, setScope] = useState<ChronologyScope>('active');
  const [missions, setMissions] = useState<ChronologyMission[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setMissions(null);
    setError(null);
    listMyChronologies(scope)
      .then((data) => {
        if (active) setMissions(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Erreur de chargement.');
      });
    return () => {
      active = false;
    };
  }, [scope]);

  const historyGroups = missions
    ? [...missions]
        .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
        .reduce<{ key: string; items: ChronologyMission[] }[]>((groups, mission) => {
          const key = monthKey(mission.lastActivityAt);
          const last = groups[groups.length - 1];
          if (last?.key === key) {
            last.items.push(mission);
          } else {
            groups.push({ key, items: [mission] });
          }
          return groups;
        }, [])
        .sort((a, b) => b.key.localeCompare(a.key))
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
        {(['active', 'history'] as ChronologyScope[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setScope(value)}
            className={cn(
              'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              scope === value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {value === 'active' ? 'En cours' : 'Historique'}
          </button>
        ))}
      </div>

      {error ? (
        <Alert variant="error">{error}</Alert>
      ) : missions === null ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Spinner size="md" />
        </div>
      ) : missions.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Icon name="clock" size="lg" />}
              title={scope === 'active' ? 'Aucune mission en cours' : 'Aucun historique'}
              description={
                scope === 'active'
                  ? 'Vos missions en cours apparaîtront ici avec leur chronologie.'
                  : 'Les missions confirmées ou annulées apparaîtront ici, du plus récent au plus ancien.'
              }
            />
          </CardContent>
        </Card>
      ) : scope === 'active' ? (
        <div className="space-y-3">
          {missions.map((mission) => {
            const label = deviceLabel(mission);
            return (
              <Link
                key={mission.id}
                href={`${detailPrefix}/${mission.id}`}
                className="block rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-semibold text-primary">
                    {mission.reference}
                  </span>
                  <DemandeStatusBadge status={mission.status} context={badgeContext} />
                </div>
                {label ? <p className="mt-1 truncate text-sm text-foreground">{label}</p> : null}
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {mission.technician ? (
                    <p>
                      Technicien :{' '}
                      {fullName(mission.technician.firstName, mission.technician.lastName)}
                    </p>
                  ) : null}
                  {mission.client ? (
                    <p>
                      Client : {fullName(mission.client.firstName, mission.client.lastName)}
                    </p>
                  ) : null}
                  <p>Dernière activité : {shortDate(mission.lastActivityAt)}</p>
                </div>
                <div className="mt-2">
                  <MiniProgress status={mission.status} />
                </div>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Ouvrir la chronologie
                  <Icon name="chevron-right" size="sm" />
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="space-y-6">
          {historyGroups.map((group) => (
            <div key={group.key} className="space-y-2">
              <p className="px-1 text-sm font-semibold capitalize">{monthLabel(group.key)}</p>
              {group.items.map((mission) => (
                <Link
                  key={mission.id}
                  href={`${detailPrefix}/${mission.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-sm transition-colors hover:bg-muted/40"
                >
                  <span className="font-mono font-medium text-primary">{mission.reference}</span>
                  <span className="text-foreground">
                    {HISTORY_TITLES[mission.status] ?? mission.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {shortDate(mission.lastActivityAt)}
                  </span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}