'use client';

import { useEffect, useRef } from 'react';
import { siteConfig } from '@/lib/site-config';
import { useRealtime } from './sse-context';
import type { RealtimeMessage } from './sse-client';

/* Flux personnel (`user:<id>`) : notifications. Le flux techniciens
 * (`technician:available`) : nouvelles missions, missions prises. */

export function userStreamUrl(): string {
  return `${siteConfig.apiBaseUrl}/realtime/user`;
}

export function technicianStreamUrl(): string {
  return `${siteConfig.apiBaseUrl}/realtime/technician/stream`;
}

export function useUserStream(onEvent: (message: RealtimeMessage) => void): void {
  const { subscribe } = useRealtime();
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    return subscribe(userStreamUrl(), (message) => handlerRef.current(message));
  }, [subscribe]);
}

export function useTechnicianStream(onEvent: (message: RealtimeMessage) => void): void {
  const { subscribe } = useRealtime();
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    return subscribe(technicianStreamUrl(), (message) => handlerRef.current(message));
  }, [subscribe]);
}
