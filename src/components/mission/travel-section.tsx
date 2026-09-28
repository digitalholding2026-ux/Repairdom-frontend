'use client';

import { useRef, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { SectionHeader } from '@/components/ui/page-header';
import {
  formatTravelAccuracy,
  formatTravelDistance,
  formatTravelRecency,
  getCurrentTravelPosition,
  gpsDegradedMessage,
  gpsInaccurateMessage,
  isUsableTravelAccuracy,
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
 * ne bloquent jamais la mission (affichage en ligne, zone dédiée).
 * CHANTIER GPS P0/P1 — « Je suis en route » part TOUJOURS (avec ou sans
 * GPS) : le backend accepte un corps vide. Un fix trop imprécis n'est
 * jamais transmis comme position fraîche. L'actualisation manuelle est
 * protégée contre les appels trop rapprochés (30 s, miroir backend). */

const TRAVELABLE_STATUSES = ['SCHEDULED', 'IN_PROGRESS'];

/* Throttle local de l'actualisation manuelle (miroir du backend
 * `GPS_TRAVEL_REFRESH_THROTTLE_MS`) : évite les écritures DB inutiles
 * (double-clic) sans empêcher une vraie nouvelle position. */
const REFRESH_THROTTLE_MS = 30_000;

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
  /* Information non bloquante (départ sans GPS, actualisation ignorée) :
   * l'action métier a abouti, seule la position manque. */
  const [gpsInfo, setGpsInfo] = useState<string | null>(null);
  const [arrivedWithoutGps, setArrivedWithoutGps] = useState(false);
  /* Départ enregistré sans position exploitable (GPS indisponible ou fix
   * trop imprécis) : la mission est bien « en route ». */
  const [startedWithoutGps, setStartedWithoutGps] = useState(false);
  /* Dernier refresh manuel réussi (throttle local, miroir backend). */
  const lastRefreshAt = useRef<number>(0);
  /* Précision RÉELLE du dernier fix (navigateur uniquement, éphémère —
   * jamais stockée, jamais garantie). */
  const [lastAccuracy, setLastAccuracy] = useState<string | null>(null);

  const travel = demande.travel ?? null;
  const travelable = TRAVELABLE_STATUSES.includes(demande.status);

  // Hors mission planifiée/démarrée et sans déplacement : rien à afficher
  // (ni opportunité publique — ce composant n'est monté que sur le détail
  // d'une mission assignée — ni mission clôturée sans déplacement).
  if (!travelable && !travel?.enRoute && !travel?.arrived) return null;

  const runAction = async (action: TravelAction, withPosition: boolean) => {
    setBusy(action);
    setGpsError(null);
    setGpsInfo(null);
    setArrivedWithoutGps(false);
    setLastAccuracy(null);
    try {
      let position: { latitude: number; longitude: number; accuracy: number | null } | null = null;
      /* Échec d'acquisition GPS : « En route » et « Arrivé » continuent
       * SANS coordonnées (le backend les accepte) ; « Actualiser » n'a
       * rien à transmettre — information neutre, jamais d'erreur
       * bloquante, jamais de nouveau statut. */
      let gpsUnavailable = false;
      if (withPosition) {
        try {
          position = await getCurrentTravelPosition();
        } catch (err) {
          if (action === 'refresh') {
            setGpsInfo(toUserErrorMessage(err, 'Position indisponible pour le moment.'));
            return;
          }
          // Arrivée : la date est toujours enregistrée même sans GPS.
          if (action === 'arrived') setArrivedWithoutGps(true);
          else setStartedWithoutGps(true);
          gpsUnavailable = true;
        }
      }
      /* Fix trop imprécis : jamais transmis comme position fraîche.
       * « En route » / « Arrivé » continuent sans position exploitable ;
       * « Actualiser » est ignoré avec une information neutre. */
      if (position && !isUsableTravelAccuracy(position.accuracy)) {
        if (action === 'refresh') {
          setGpsInfo(gpsInaccurateMessage());
          return;
        }
        position = null;
        if (action === 'arrived') setArrivedWithoutGps(true);
        else {
          setStartedWithoutGps(true);
          setGpsInfo(gpsInaccurateMessage());
        }
      }
      // Throttle local de l'actualisation manuelle (le backend protège
      // aussi contre les appels trop rapprochés, même sans frontend).
      if (action === 'refresh' && Date.now() - lastRefreshAt.current < REFRESH_THROTTLE_MS) {
        setGpsInfo('Position déjà actualisée à l\u2019instant. Réessayez dans quelques secondes.');
        return;
      }
      let updated: TechnicianDemande;
      // `accuracy` reste une information d'exploitabilité : seuls lat/lng
      // (+ accuracy brute, whitelistée côté backend) partent au serveur.
      const coords = position ? { latitude: position.latitude, longitude: position.longitude } : null;
      if (action === 'route') {
        if (coords) {
          updated = await startTravel(demande.id, coords.latitude, coords.longitude, position?.accuracy);
          setStartedWithoutGps(false);
        } else {
          updated = await startTravel(demande.id);
          setStartedWithoutGps(true);
          if (!gpsUnavailable) setGpsInfo((prev) => prev ?? gpsDegradedMessage());
          else setGpsInfo(gpsDegradedMessage());
        }
      } else if (action === 'refresh') {
        if (!coords) {
          setGpsInfo(gpsDegradedMessage());
          return;
        }
        updated = await refreshTravelLocation(demande.id, coords.latitude, coords.longitude, position?.accuracy);
        lastRefreshAt.current = Date.now();
      } else {
        updated = await markTravelArrived(
          demande.id,
          coords ? { ...coords, accuracy: position?.accuracy } : undefined,
        );
      }
      onChanged(updated);
      if (position) {
        const label = formatTravelAccuracy(position.accuracy);
        if (label) setLastAccuracy(label);
      }
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
      {gpsInfo ? <Alert variant="info">{gpsInfo}</Alert> : null}

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
            {travel.latitude !== null && travel.latitude !== undefined && travel.fresh ? (
              <>
                {recency ? `Dernière position transmise ${recency}` : 'Position en cours de transmission'}
                {distance ? ` · ${distance} du lieu d\u2019intervention` : null}
                {lastAccuracy ? ` · ${lastAccuracy}` : null}
              </>
            ) : (
              <>
                Mission en route
                {startedWithoutGps || !travel.locationUpdatedAt
                  ? ' sans position GPS — la localisation n\u2019a pas pu être transmise, vous pouvez continuer sans GPS'
                  : ' · dernière position indisponible ou trop ancienne, pensez à l\u2019actualiser'}
                .
              </>
            )}
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
