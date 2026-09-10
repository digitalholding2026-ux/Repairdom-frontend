'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/lib/api/notifications-service';
import { formatDateTime } from '@/lib/format';

export interface NotificationsCenterProps {
  detailHref: (demandeId: string) => string;
}

/** Centre de notifications (historique read-only + gestion du lu). */
export function NotificationsCenter({ detailHref }: NotificationsCenterProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await listNotifications();
      setNotifications(res.items);
      setUnreadCount(res.unreadCount);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleMarkAllRead = async () => {
    setBusy(true);
    setError(null);
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour.');
    } finally {
      setBusy(false);
    }
  };

  const handleOpen = async (notification: AppNotification) => {
    if (!notification.read) {
      try {
        await markNotificationRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // La navigation reste possible même si le marquage échoue.
      }
    }
    if (notification.demandeId) {
      router.push(detailHref(notification.demandeId));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <Alert variant="error">{error}</Alert> : null}
      {notifications.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Icon name="bell" size="lg" />}
              title="Aucune notification"
              description="Vous n&apos;avez pas encore de notification. Les actions importantes de vos missions apparaîtront ici."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {unreadCount > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => void handleMarkAllRead()}
              isLoading={busy}
            >
              Tout marquer comme lu
            </Button>
          ) : null}
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => void handleOpen(notification)}
              className={cn(
                'w-full rounded-xl border p-3 text-left transition-colors',
                notification.read
                  ? 'border-border bg-card'
                  : 'border-primary/40 bg-primary/5',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 text-sm font-semibold">{notification.title}</p>
                {!notification.read ? (
                  <span
                    aria-label="Non lue"
                    className="mt-1 size-2 shrink-0 rounded-full bg-primary"
                  />
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDateTime(notification.createdAt)}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}