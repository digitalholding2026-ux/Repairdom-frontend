'use client';

import { useEffect, useState } from 'react';
import { getNotificationUnreadCount } from '@/lib/api/notifications-service';

const POLL_INTERVAL_MS = 15000;

/** Nombre de notifications non lues, mise à jour par polling silencieux. */
export function useUnreadNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const res = await getNotificationUnreadCount();
        if (active) setUnreadCount(res.unreadCount);
      } catch {
        if (active) setUnreadCount(0);
      }
    }

    refresh();
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return unreadCount;
}