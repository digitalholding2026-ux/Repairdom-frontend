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
}

export type GpsFailure =
  | 'unsupported'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'unknown';

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

/* Acquisition ponctuelle : un seul fix, timeout configurable, haute
 * précision désactivée (économie batterie, suffisante pour « en route »).
 * Rejette avec un `Error` dont `message` est déjà un libellé FR. */
export function getCurrentTravelPosition(timeoutMs = 15000): Promise<TravelPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error(gpsErrorMessage('unsupported')));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          reject(new Error(gpsErrorMessage('unavailable')));
          return;
        }
        resolve({ latitude, longitude });
      },
      (error) => {
        const failure =
          typeof error?.code === 'number' ? failureFromCode(error.code) : 'unknown';
        reject(new Error(gpsErrorMessage(failure)));
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60000 },
    );
  });
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
