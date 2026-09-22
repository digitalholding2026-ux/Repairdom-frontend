'use client';

import { Badge } from '@/components/ui/badge';
import { useUnreadNotifications } from '@/lib/use-unread-notifications';

/** Badge de non-lues affiché sur l'onglet Notifications de la navigation du bas. */
export function NotificationTabBadge() {
  const count = useUnreadNotifications();

  if (count === 0) return null;

  return (
    <span className="absolute -right-1 -top-1">
      <Badge
        variant="danger"
        className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-2xs font-bold leading-none"
      >
        {count > 99 ? '99+' : count}
      </Badge>
    </span>
  );
}