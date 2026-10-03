'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getStoredPushEndpoint,
  pushSupportState,
  setStoredPushEndpoint,
  subscribeBrowserPush,
  unsubscribeBrowserPush,
  type PushSupportState,
} from './push-client';
import {
  getVapidPublicKey,
  sendPushSubscription,
  sendPushUnsubscribe,
  sendPushTest,
} from '@/lib/api/push-service';

/* État push : unsupported | denied | granted-non souscrit | souscrit.
 * Aucune permission n'est demandée au montage (opt-in explicite par clic).
 * `refresh()` resynchronise (permission navigateur + endpoint stocké). */

export type PushUiState =
  | 'unsupported'
  | 'unsupported_ios_needs_install'
  | 'denied'
  | 'off'
  | 'subscribed';

interface PushContextValue {
  state: PushUiState;
  busy: boolean;
  error: string | null;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  test: () => Promise<void>;
  refresh: () => void;
}

const PushContext = createContext<PushContextValue | null>(null);

function detectState(subscribed: boolean): PushUiState {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return 'unsupported';
  const support: PushSupportState = pushSupportState(navigator, window);
  if (support === 'unsupported_no_api') return 'unsupported';
  if (support === 'unsupported_ios_needs_install') return 'unsupported_ios_needs_install';
  if (typeof Notification !== 'undefined' && Notification.permission === 'denied') return 'denied';
  return subscribed ? 'subscribed' : 'off';
}

export function PushProvider({ children }: { children: ReactNode }) {
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setSubscribed(getStoredPushEndpoint() !== null);
  }, [tick]);

  const refresh = useCallback(() => setTick((value) => value + 1), []);

  const enable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const { publicKey } = await getVapidPublicKey();
      if (!publicKey) {
        throw new Error('Notifications push indisponibles pour le moment (configuration manquante).');
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        refresh();
        return;
      }
      const subscription = await subscribeBrowserPush(registration, publicKey);
      await sendPushSubscription({
        subscription,
        userAgent: navigator.userAgent,
      });
      setStoredPushEndpoint(subscription.endpoint);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Activation impossible. Réessayez.');
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const disable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const endpoint = getStoredPushEndpoint();
      if (endpoint) await sendPushUnsubscribe(endpoint);
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (registration) await unsubscribeBrowserPush(registration);
      setStoredPushEndpoint(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Désactivation impossible. Réessayez.');
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const test = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await sendPushTest();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test impossible. Réessayez.');
    } finally {
      setBusy(false);
    }
  }, []);

  const value = useMemo<PushContextValue>(
    () => ({ state: detectState(subscribed), busy, error, enable, disable, test, refresh }),
    [subscribed, busy, error, enable, disable, test, refresh],
  );

  return <PushContext.Provider value={value}>{children}</PushContext.Provider>;
}

export function usePush(): PushContextValue {
  const ctx = useContext(PushContext);
  if (!ctx) throw new Error('usePush doit être utilisé à l’intérieur de <PushProvider>.');
  return ctx;
}
