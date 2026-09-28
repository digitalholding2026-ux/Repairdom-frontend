'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { SectionHeader } from '@/components/ui/page-header';
import {
  formatTravelDistance,
  formatTravelRecency,
  getCurrentTravelPosition,
} from '@/lib/travel-location';
import {
  markTravelArrived,
  refreshTravelLocation,
  startTravel,
  type TechnicianDemande,
} from '@/lib/api/technician-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';

/* GPS V3 — section « Déplacement » du détail mission technicien.
 * Transmissions EXPLICITES et ponctuelles uniquement (« Je suis en route »,
 * « Actualiser ma position », « Je suis arrivé ») : aucun tracking, aucun
 * `watchPosition`, aucun arrière-plan. La position n'est partagée avec le
 * client que pour CETTE mission, le temps du déplacement. Les erreurs GPS
 * ne bloquent jamais la mission (affichage en ligne, zone dédiée). */

const TRAVELABLE_STATUSES = ['SCHEDULED', 'IN_PROGRESS'];

type TravelAction = 'route' | 'refresh' | 'arrived';

export function TravelSection({
  demande,
  onChanged,
}: {
  demande: TechnicianDemande;
  onChanged: (demande: TechnicianDemande) => void;
}) {
  const [busy, setBusy] = useState<TravelAction | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [arrivedWithoutGps, setArrivedWithoutGps] = useState(false);

  const travel = demande.travel ?? null;
  const travelable = TRAVELABLE_STATUSES.includes(demande.status);

  // Hors mission planifiée/démarrée et sans déplacement : rien à afficher
  // (ni opportunité publique — ce composant n'est monté que sur le détail
  // d'une mission assignée — ni mission clôturée sans déplacement).
  if (!travelable && !travel?.enRoute && !travel?.arrived) return null;

  const runAction = async (action: TravelAction, withPosition: boolean) => {
    setBusy(action);
    setGpsError(null);
    setArrivedWithoutGps(false);
    try {
      let position: { latitude: number; longitude: number } | null = null;
      if (withPosition) {
        try {
          position = await getCurrentTravelPosition();
        } catch (err) {
          // Arrivée : la date est toujours enregistrée même sans GPS.
          if (action !== 'arrived') {
            setGpsError(err instanceof Error ? err.message : 'Position indisponible.');
            return;
          }
          setArrivedWithoutGps(true);
        }
      }
      let updated: TechnicianDemande;
      if (action === 'route') {
        updated = await startTravel(demande.id, position!.latitude, position!.longitude);
      } else if (action === 'refresh') {
        updated = await refreshTravelLocation(demande.id, position!.latitude, position!.longitude);
      } else {
        updated = await markTravelArrived(
          demande.id,
          position ?? undefined,
        );
      }
      onChanged(updated);
    } catch (err) {
      setGpsError(toUserErrorMessage(err, 'Action impossible pour le moment.'));
    } finally {
      setBusy(null);
    }
  };

  const recency = formatTravelRecency(travel?.minutesSinceUpdate);
  const distance = travel?.fresh ? formatTravelDistance(travel?.distanceMeters) : null;

  return (
    <div className="space-y-3">
      <SectionHeader title="Déplacement" icon="truck" />

      {gpsError ? <Alert variant="error">{gpsError}</Alert> : null}

      {travel?.arrived ? (
        <Alert variant="success" icon="check-circle" dense>
          Arrivée enregistrée. Le déplacement est clos : votre position n&apos;est plus partagée.
          {arrivedWithoutGps ? ' (position GPS indisponible lors de l\u2019arrivée)' : null}
        </Alert>
      ) : travel?.enRoute ? (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-success" />
            </span>
            En route
          </p>
          <p className="text-xs text-muted-foreground">
            {recency ? `Dernière position transmise ${recency}` : 'Position en cours de transmission'}
            {distance ? ` · ${distance} du lieu d\u2019intervention` : null}
            {!travel.fresh && travel.minutesSinceUpdate !== null && travel.minutesSinceUpdate !== undefined
              ? ' · position périmée, pensez à l\u2019actualiser'
              : null}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              onClick={() => void runAction('refresh', true)}
              isLoading={busy === 'refresh'}
              disabled={busy !== null}
              className="flex-1"
            >
              <Icon name="clock" size="sm" />
              Actualiser ma position
            </Button>
            <Button
              onClick={() => void runAction('arrived', true)}
              isLoading={busy === 'arrived'}
              disabled={busy !== null}
              className="flex-1"
            >
              <Icon name="check-circle" size="sm" />
              Je suis arrivé
            </Button>
          </div>
        </div>
      ) : travelable ? (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Prévenez le client quand vous partez : votre position n&apos;est partagée avec lui que
            pour cette mission, le temps du déplacement. Aucun suivi permanent.
          </p>
          <Button
            onClick={() => void runAction('route', true)}
            isLoading={busy === 'route'}
            disabled={busy !== null}
            className="w-full"
            size="lg"
          >
            <Icon name="truck" size="sm" />
            Je suis en route
          </Button>
        </div>
      ) : null}
    </div>
  );
}
