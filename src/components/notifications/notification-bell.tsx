'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { useUnreadNotifications } from '@/lib/use-unread-notifications';

export interface NotificationBellProps {
  href: string;
}

/** Cloche de notifications (compteur non lues, polling silencieux). */
export function NotificationBell({ href }: NotificationBellProps) {
  const unreadCount = useUnreadNotifications();

  return (
    <Link
      href={href}
      aria-label="Notifications"
      className="relative inline-flex items-center justify-center rounded-full transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
    >
      <span className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted">
        <Icon name="bell" size="md" strokeWidth={1.8} />
      </span>
      {unreadCount > 0 ? (
        <Badge
          variant="danger"
          className="absolute -right-0.5 -top-0.5 min-w-5 h-5 items-center justify-center rounded-full px-1 text-2xs font-bold leading-none"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      ) : null}
    </Link>
  );
}