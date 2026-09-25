'use client';

import { useEffect, useState } from 'react';
import { getNotificationUnreadCount } from '@/lib/api/notifications-service';

const POLL_INTERVAL_MS = 15000;

/* Compteur mutualisé : un seul intervalle de polling par onglet, quel que
 * soit le nombre de composants montés (cloche du header, badge du BottomNav).
 * Chaque instance s’abonne/désabonne ; le timer démarre au premier abonné et
 * s’arrête au dernier. Le contrat API est inchangé. */
let subscriberCount = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let cachedCount = 0;
const listeners = new Set<(count: number) => void>();

async function refreshShared() {
  try {
    const res = await getNotificationUnreadCount();
    cachedCount = res.unreadCount;
  } catch {
    cachedCount = 0;
  }
  for (const listener of listeners) listener(cachedCount);
}

function subscribe(listener: (count: number) => void): () => void {
  listeners.add(listener);
  subscriberCount += 1;
  if (subscriberCount === 1) {
    void refreshShared();
    /* UI-7 : pas de polling onglet masqué (batterie/réseau mobile) ; le
     * compteur se rafraîchit au prochain tick visible. */
    timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void refreshShared();
    }, POLL_INTERVAL_MS);
  } else {
    listener(cachedCount);
  }
  return () => {
    listeners.delete(listener);
    subscriberCount = Math.max(0, subscriberCount - 1);
    if (subscriberCount === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** Nombre de notifications non lues, mise à jour par polling silencieux. */
export function useUnreadNotifications() {
  const [unreadCount, setUnreadCount] = useState(cachedCount);

  useEffect(() => subscribe(setUnreadCount), []);

  return unreadCount;
}
