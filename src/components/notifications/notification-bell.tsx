'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { getNotificationUnreadCount } from '@/lib/api/notifications-service';

const POLL_INTERVAL_MS = 15000;

export interface NotificationBellProps {
  href: string;
}

/** Cloche de notifications (compteur non lues, polling silencieux). */
export function NotificationBell({ href }: NotificationBellProps) {
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

  return (
    <Link
      href={href}
      aria-label="Notifications"
      className="relative inline-flex items-center justify-center rounded-full"
    >
      <span className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted">
        <Icon name="bell" size="md" strokeWidth={1.8} />
      </span>
      {unreadCount > 0 ? (
        <Badge
          variant="danger"
          className="absolute -right-0.5 -top-0.5 min-w-5 h-5 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      ) : null}
    </Link>
  );
}