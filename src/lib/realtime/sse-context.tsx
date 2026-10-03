'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  realtimeClient,
  type RealtimeHandler,
  type RealtimeStatus,
} from './sse-client';
import { useToast } from '@/lib/toast-context';

/* Contexte temps réel partagé : expose le statut (`sse` | `polling` |
 * `offline`) et la souscription (connexion mutualisée par URL).
 * À la bascule en `polling`, un toast discret unique prévient
 * l'utilisateur (actualisation manuelle) ; les écrans réactivent alors
 * leur polling existant en fallback. Placé sous `ToastProvider` (layout). */

interface RealtimeContextValue {
  status: RealtimeStatus;
  subscribe: (url: string, handler: RealtimeHandler) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<RealtimeStatus>(() => realtimeClient.getStatus());
  const { toast } = useToast();
  const toastShown = useRef(false);

  useEffect(() => {
    return realtimeClient.onStatusChange((next) => {
      setStatus(next);
      if (next === 'polling' && !toastShown.current) {
        toastShown.current = true;
        toast({
          id: 'realtime-fallback',
          title: 'Mise à jour en temps réel indisponible, actualisation manuelle',
          variant: 'warning',
        });
      }
      if (next === 'sse') toastShown.current = false;
    });
  }, [toast]);

  const subscribe = useCallback(
    (url: string, handler: RealtimeHandler) => realtimeClient.subscribe(url, handler),
    [],
  );

  return (
    <RealtimeContext.Provider value={{ status, subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime doit être utilisé à l’intérieur de <RealtimeProvider>.');
  return ctx;
}
