'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { DemandeStatusBadge } from '@/components/ui/status-badge';
import { MissionTimeline } from '@/components/mission/mission-timeline';
import { DemandeProgress } from '@/components/mission/demande-progress';
import { getMissionSummary, type MissionSummary } from '@/lib/api/summary-service';
import { listMissionEvents, type MissionEvent } from '@/lib/api/mission-events-service';
import { demandeStatusConfig } from '@/lib/request-status';
import type { StatusContext } from '@/lib/request-status';

export interface ChronologyDetailProps {
  missionId?: string;
  backHref: string;
  badgeContext: StatusContext;
}

/** Chronologie complète d'une mission (réutilise DemandeEvent via
 *  listMissionEvents + summary existant, legacy → DemandeProgress). */
export function ChronologyDetail({ missionId, backHref, badgeContext }: ChronologyDetailProps) {
  const [summary, setSummary] = useState<MissionSummary | null>(null);
  const [events, setEvents] = useState<MissionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!missionId) return;
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      getMissionSummary(missionId).catch(() => null),
      listMissionEvents(missionId).catch(() => []),
    ])
      .then(([s, ev]) => {
        if (!active) return;
        setSummary(s);
        setEvents(ev);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Erreur de chargement.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [missionId]);

  if (!missionId) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const deviceLabel = summary
    ? [
        summary.device.domain?.name,
        summary.device.brand?.name,
        summary.device.model?.name,
        summary.device.problem?.name,
      ]
        .filter(Boolean)
        .join(' — ')
    : '';
  const lastEvent = events[events.length - 1] ?? null;
  const lastActivityLabel = lastEvent
    ? lastEvent.label
    : summary
      ? demandeStatusConfig(summary.status, badgeContext).label
      : '—';

  return (
    <div className="space-y-4">
      {error ? <Alert variant="error">{error}</Alert> : null}

      {summary ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-base font-semibold text-primary">
                {summary.reference}
              </span>
              <DemandeStatusBadge status={summary.status} context={badgeContext} />
            </div>
            {deviceLabel ? (
              <p className="mt-1 text-sm text-muted-foreground">{deviceLabel}</p>
            ) : null}
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Dernière activité : <span className="font-medium text-foreground">{lastActivityLabel}</span>
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon name="clock" size="sm" className="text-muted-foreground" />
            Étapes de la mission
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length > 0 ? (
            <MissionTimeline events={events} />
          ) : summary ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Cette mission ne dispose pas d&apos;événements détaillés : nous affichons son
                avancement selon son statut actuel.
              </p>
              <div className="rounded-xl border border-border bg-card p-4">
                <DemandeProgress status={summary.status} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Chronologie indisponible pour cette mission.
            </p>
          )}
        </CardContent>
      </Card>

      <Link href={backHref} className="inline-block">
        <Button variant="secondary" size="sm">
          <Icon name="arrow-left" size="sm" />
          Retour
        </Button>
      </Link>
    </div>
  );
}