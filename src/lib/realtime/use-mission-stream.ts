'use client';

import { useEffect, useRef } from 'react';
import { siteConfig } from '@/lib/site-config';
import { useRealtime } from './sse-context';
import type { RealtimeMessage } from './sse-client';

/* Abonnement au flux d'une mission (`mission:<id>` : chat, statuts, GPS).
 * Le handler est conservé en ref (pas de réabonnement à chaque render) ;
 * désinscription propre à l'unmount ou au changement de mission. */

export function missionStreamUrl(demandeId: string): string {
  return `${siteConfig.apiBaseUrl}/realtime/missions/${encodeURIComponent(demandeId)}`;
}

export function useMissionStream(
  demandeId: string | undefined,
  onEvent: (message: RealtimeMessage) => void,
): void {
  const { subscribe } = useRealtime();
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!demandeId) return;
    return subscribe(missionStreamUrl(demandeId), (message) => handlerRef.current(message));
  }, [demandeId, subscribe]);
}
