/* Client push web VAPID (navigateur uniquement, sans dépendance).
 *
 * Fonctions pures testables (env injecté, pas de globals directs) +
 * opérations navigateur (permission, abonnement). Jamais de demande de
 * permission au chargement : uniquement sur clic explicite « Activer ».
 */

export type PushSupportState =
  | 'supported'
  | 'unsupported_no_api'
  | 'unsupported_ios_needs_install';

interface NavigatorLike {
  userAgent?: string;
  standalone?: boolean;
  serviceWorker?: unknown;
}

interface WindowLike {
  PushManager?: unknown;
  matchMedia?: (query: string) => { matches: boolean };
}

/** Capacités push (APIs présentes + cas iOS hors standalone). */
export function pushSupportState(
  navigatorLike: NavigatorLike,
  windowLike: WindowLike,
): PushSupportState {
  if (navigatorLike.serviceWorker === undefined || windowLike.PushManager === undefined) {
    return 'unsupported_no_api';
  }
  const userAgent = navigatorLike.userAgent ?? '';
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
  const standalone =
    windowLike.matchMedia?.('(display-mode: standalone)').matches === true ||
    navigatorLike.standalone === true;
  if (isIOS && isSafari && !standalone) return 'unsupported_ios_needs_install';
  return 'supported';
}

/** Clé VAPID base64url → Uint8Array (format exigé par PushManager). */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const output: Uint8Array<ArrayBuffer> = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

const STORED_ENDPOINT_KEY = 'relio-push-endpoint';

export function getStoredPushEndpoint(storage?: Storage | null): string | null {
  try {
    const store =
      storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
    return store?.getItem(STORED_ENDPOINT_KEY) ?? null;
  } catch {
    return null;
  }
}

export function setStoredPushEndpoint(endpoint: string | null, storage?: Storage | null): void {
  try {
    const store =
      storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!store) return;
    if (endpoint) store.setItem(STORED_ENDPOINT_KEY, endpoint);
    else store.removeItem(STORED_ENDPOINT_KEY);
  } catch {
    // Stockage indisponible (navigation privée) : non bloquant.
  }
}

export interface BrowserPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Abonne le navigateur (permission déjà accordée par l'utilisateur).
 *  Retourne la subscription à transmettre au backend. */
export async function subscribeBrowserPush(
  registration: ServiceWorkerRegistration,
  vapidPublicKey: string,
): Promise<BrowserPushSubscription> {
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
  const raw = subscription.toJSON();
  if (!raw.endpoint || !raw.keys?.p256dh || !raw.keys?.auth) {
    throw new Error("Abonnement push incomplet (endpoint ou clés manquants).");
  }
  return {
    endpoint: raw.endpoint,
    keys: { p256dh: raw.keys.p256dh, auth: raw.keys.auth },
  };
}

/** Désabonne le navigateur (best-effort, jamais bloquant). */
export async function unsubscribeBrowserPush(
  registration: ServiceWorkerRegistration,
): Promise<void> {
  try {
    const subscription = await registration.pushManager.getSubscription();
    await subscription?.unsubscribe();
  } catch {
    // Déjà désabonné ou API indisponible : silencieux.
  }
}
