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
import { MissionStepper } from '@/components/mission/mission-stepper';
import { TrackingHero } from '@/components/mission/tracking-hero';
import { Celebration } from '@/components/mission/celebration';
import { getMissionSummary, type MissionSummary } from '@/lib/api/summary-service';
import { listMissionEvents, type MissionEvent } from '@/lib/api/mission-events-service';
import { STATUS_PROGRESS } from '@/lib/mission-progress';
import { demandeStatusConfig } from '@/lib/request-status';
import type { StatusContext } from '@/lib/request-status';
import { fullName } from '@/lib/format';

export interface ChronologyDetailProps {
  missionId?: string;
  backHref: string;
  badgeContext: StatusContext;
}

/** Chronologie complète d'une mission, présentée en « suivi en direct »
 *  (hero + stepper animé + confettis de fin), avec le détail des événements. */
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
  const status = summary?.status ?? '';
  const statusConfig = demandeStatusConfig(summary?.status, badgeContext);
  const progress = STATUS_PROGRESS[status] ?? 0;
  const live = !['COMPLETED', 'CONFIRMED', 'CANCELED'].includes(status);
  const canceled = status === 'CANCELED';
  const success = status === 'COMPLETED' || status === 'CONFIRMED';
  const lastActivityLabel = lastEvent ? lastEvent.label : statusConfig.label;

  return (
    <div className="space-y-4">
      {error ? <Alert variant="error">{error}</Alert> : null}

      {summary ? (
        <TrackingHero
          badge={<DemandeStatusBadge status={summary.status} context={badgeContext} />}
          reference={summary.reference}
          title={deviceLabel || summary.category}
          subtitle={summary.category}
          progress={progress}
          live={live}
          canceled={canceled}
          statusLabel={lastActivityLabel}
          technician={
            summary.technician
              ? {
                  firstName: summary.technician.firstName,
                  lastName: summary.technician.lastName,
                  label: fullName(summary.technician.firstName, summary.technician.lastName),
                  verified: true,
                }
              : null
          }
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon name="clock" size="sm" className="text-muted-foreground" />
            Étapes de la mission
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary ? (
            <MissionStepper
              status={summary.status}
              currentHint={live ? `En attente : ${lastActivityLabel}` : lastActivityLabel}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Chronologie indisponible pour cette mission.
            </p>
          )}
        </CardContent>
      </Card>

      {events.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon name="file" size="sm" className="text-muted-foreground" />
              Journal des événements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MissionTimeline events={events} />
          </CardContent>
        </Card>
      ) : null}

      {success ? (
        <Celebration
          title={status === 'CONFIRMED' ? 'Mission confirmée' : 'Intervention terminée'}
          subtitle="Votre technicien a terminé l’intervention. Merci pour votre confiance !"
        >
          <Link
            href={`/${badgeContext === 'technician' ? 'technicien' : 'client'}/demandes/${missionId}`}
            className="inline-block"
          >
            <Button size="lg" className="w-full sm:w-auto">
              Voir le récapitulatif
              <Icon name="chevron-right" size="sm" />
            </Button>
          </Link>
        </Celebration>
      ) : null}

      <Link href={backHref} className="inline-block">
        <Button variant="secondary" size="sm">
          <Icon name="arrow-left" size="sm" />
          Retour
        </Button>
      </Link>
    </div>
  );
}