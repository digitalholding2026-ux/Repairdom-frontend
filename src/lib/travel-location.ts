/* GPS V3 — helpers déplacement temporaire (« technicien en route »).
 *
 * Pur et sans dépendance : formatage d'affichage (jamais de coordonnées
 * brutes exposées), mapping des erreurs de géolocalisation et acquisition
 * EXPLICITE et PONCTUELLE de la position (un seul `getCurrentPosition`,
 * jamais de `watchPosition`, jamais d'arrière-plan). Les erreurs GPS ne
 * doivent jamais empêcher le fonctionnement général de la mission. */

export interface TravelPosition {
  latitude: number;
  longitude: number;
  /* Précision horizontale (mètres) FOURNIE PAR LE NAVIGATEUR (`coords.accuracy`),
   * `null` si indisponible. Jamais inventée, jamais garantie : dépend du
   * GPS du téléphone, du signal, des permissions et de l'environnement. */
  accuracy: number | null;
}

export type GpsFailure =
  | 'unsupported'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'unknown';

/* CHANTIER GPS P0/P1 — seuil d'exploitabilité d'un fix (miroir backend
 * `GPS_TRAVEL_MAX_ACCURACY_M`, 500 m) : au-delà, le fix n'est jamais
 * présenté comme une localisation précise et n'est jamais transmis comme
 * position « fraîche » — l'action métier (« En route ») part SANS
 * coordonnées. `null` (navigateur muet) = pas d'information : le fix reste
 * transmis (compatibilité, les bornes lat/lng restent exigées côté
 * backend). Pur, sans dépendance. */
export const TRAVEL_MAX_ACCURACY_M = 500;

export function isUsableTravelAccuracy(accuracy: number | null | undefined): boolean {
  if (accuracy === null || accuracy === undefined) return true;
  return Number.isFinite(accuracy) && accuracy >= 0 && accuracy <= TRAVEL_MAX_ACCURACY_M;
}

/** Message neutre quand l'action métier continue sans GPS (ni erreur
 *  bloquante, ni jargon) : le départ est bien enregistré. */
export function gpsDegradedMessage(): string {
  return 'Mission passée en route. La localisation n\u2019a pas pu être transmise : vous pouvez continuer sans GPS.';
}

/** Message quand le fix est trop imprécis pour être exploité. */
export function gpsInaccurateMessage(): string {
  return 'Position trop imprécise pour être partagée. Mission passée en route sans position : réessayez à ciel ouvert pour actualiser.';
}

/** Libellé FR d'un échec d'acquisition GPS (rassurant, sans jargon). */
export function gpsErrorMessage(failure: GpsFailure): string {
  switch (failure) {
    case 'unsupported':
      return 'La géolocalisation n\u2019est pas disponible sur cet appareil.';
    case 'denied':
      return 'Autorisation de localisation refusée. Activez-la dans les réglages du navigateur pour partager votre position.';
    case 'timeout':
      return 'Localisation trop lente : réessayez dans un endroit à ciel ouvert.';
    case 'unavailable':
      return 'Position indisponible pour le moment. Réessayez ou continuez sans GPS.';
    default:
      return 'Localisation momentanément indisponible. Réessayez.';
  }
}

function failureFromCode(code: number): GpsFailure {
  if (code === 1) return 'denied';
  if (code === 2) return 'unavailable';
  if (code === 3) return 'timeout';
  return 'unknown';
}

/* Acquisition ponctuelle en DEUX TEMPS (toujours un seul fix à la fois,
 * jamais de `watchPosition`) :
 *  1. position PRÉCISE et FRAÎCHE (`enableHighAccuracy: true`,
 *     `maximumAge: 0`, 12 s) quand l'appareil le permet ;
 *  2. en cas de timeout uniquement, repli RAPIDE sur un fix standard
 *     éventuellement en cache (8 s) plutôt qu'un échec sec.
 * Résout avec `{ latitude, longitude, accuracy }` (`accuracy` = valeur
 * réelle du navigateur ou `null`). Rejette avec un `Error` dont `message`
 * est déjà un libellé FR. */
export function getCurrentTravelPosition(timeoutMs = 12000): Promise<TravelPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error(gpsErrorMessage('unsupported')));
      return;
    }
    const pick = (position: GeolocationPosition): TravelPosition => ({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy:
        typeof position.coords.accuracy === 'number' &&
        Number.isFinite(position.coords.accuracy) &&
        position.coords.accuracy >= 0
          ? Math.round(position.coords.accuracy)
          : null,
    });
    const valid = (position: GeolocationPosition): boolean =>
      Number.isFinite(position.coords.latitude) && Number.isFinite(position.coords.longitude);
    const onError = (error: GeolocationPositionError | null, fallback: () => void) => {
      // Seul le timeout déclenche le repli (les autres échecs — refus,
      // indisponibilité — sont définitifs pour cette tentative).
      if (error?.code === 3) {
        fallback();
        return;
      }
      const failure =
        typeof error?.code === 'number' ? failureFromCode(error.code) : 'unknown';
      reject(new Error(gpsErrorMessage(failure)));
    };
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!valid(position)) {
          reject(new Error(gpsErrorMessage('unavailable')));
          return;
        }
        resolve(pick(position));
      },
      (error) => {
        onError(error, () => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              if (!valid(position)) {
                reject(new Error(gpsErrorMessage('unavailable')));
                return;
              }
              resolve(pick(position));
            },
            (retryError) => {
              const failure =
                typeof retryError?.code === 'number'
                  ? failureFromCode(retryError.code)
                  : 'unknown';
              reject(new Error(gpsErrorMessage(failure)));
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
          );
        });
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}

/** Précision réelle d'affichage (« précision ~25 m »), `null` si le
 *  navigateur ne l'a pas fournie (jamais inventée). */
export function formatTravelAccuracy(accuracy: number | null | undefined): string | null {
  if (accuracy === null || accuracy === undefined || !Number.isFinite(accuracy) || accuracy < 0) {
    return null;
  }
  return `précision ~${Math.round(accuracy)} m`;
}

/* GPS V4.1 — variante courte (« ~25 m ») pour les confirmations
 * (« Précision estimée : ~25 m »). Mêmes garanties : valeur réelle du
 * navigateur uniquement, `null` si inconnue (jamais de fiction). */
export function formatTravelAccuracyShort(accuracy: number | null | undefined): string | null {
  const label = formatTravelAccuracy(accuracy);
  return label ? label.replace(/^précision\s+/, '') : null;
}

/** Distance approximative d'affichage (« à ~850 m », « à ~2,4 km »),
 *  `null` si inconnue (jamais de `0 km` forcé). */
export function formatTravelDistance(meters: number | null | undefined): string | null {
  if (meters === null || meters === undefined || !Number.isFinite(meters) || meters < 0) {
    return null;
  }
  if (meters < 1000) return `à ~${Math.round(meters)} m`;
  const km = meters / 1000;
  return `à ~${km.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`;
}

/** Fraîcheur d'affichage (« à l'instant », « il y a X min »),
 *  `null` si inconnue. */
export function formatTravelRecency(minutes: number | null | undefined): string | null {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes) || minutes < 0) {
    return null;
  }
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${Math.floor(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.floor(hours / 24)} j`;
}
