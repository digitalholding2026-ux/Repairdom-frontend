'use client';

import { useEffect, useState } from 'react';
import { getNotificationUnreadCount } from '@/lib/api/notifications-service';
import { siteConfig } from '@/lib/site-config';
import { realtimeClient } from '@/lib/realtime/sse-client';

const POLL_INTERVAL_MS = 15000;

/* Compteur mutualisé : un seul intervalle de polling par onglet, quel que
 * soit le nombre de composants montés (cloche du header, badge du BottomNav).
 * Chaque instance s’abonne/désabonne ; le timer démarre au premier abonné et
 * s’arrête au dernier. Le contrat API est inchangé.
 *
 * Temps réel : le premier abonné souscrit aussi au flux `user` — à chaque
 * `notification.created`, le compteur est incrémenté localement (aucun
 * fetch) et le polling est mis en pause tant que le SSE est actif
 * (fallback automatique sinon). */
let subscriberCount = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let cachedCount = 0;
const listeners = new Set<(count: number) => void>();
let unsubscribeStream: (() => void) | null = null;

function notifyAll(count: number): void {
  cachedCount = count;
  for (const listener of listeners) listener(cachedCount);
}

async function refreshShared() {
  try {
    const res = await getNotificationUnreadCount();
    notifyAll(res.unreadCount);
  } catch {
    notifyAll(0);
  }
}

/** Incrémente le compteur (événement SSE) sans fetch. Testé via listeners. */
export function bumpUnreadNotifications(): void {
  notifyAll(cachedCount + 1);
}

function subscribe(listener: (count: number) => void): () => void {
  listeners.add(listener);
  subscriberCount += 1;
  if (subscriberCount === 1) {
    void refreshShared();
    unsubscribeStream = realtimeClient.subscribe(
      `${siteConfig.apiBaseUrl}/realtime/user`,
      (message) => {
        if (message.type === 'notification.created') bumpUnreadNotifications();
      },
    );
    /* UI-7 : pas de polling onglet masqué (batterie/réseau mobile) ; le
     * compteur se rafraîchit au prochain tick visible. */
    timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (realtimeClient.getStatus() === 'sse') return;
      void refreshShared();
    }, POLL_INTERVAL_MS);
  } else {
    listener(cachedCount);
  }
  return () => {
    listeners.delete(listener);
    subscriberCount = Math.max(0, subscriberCount - 1);
    if (subscriberCount === 0) {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      if (unsubscribeStream) {
        unsubscribeStream();
        unsubscribeStream = null;
      }
    }
  };
}

/** Nombre de notifications non lues (SSE en direct, polling en fallback). */
export function useUnreadNotifications() {
  const [unreadCount, setUnreadCount] = useState(cachedCount);

  useEffect(() => subscribe(setUnreadCount), []);

  return unreadCount;
}
