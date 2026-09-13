'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { SkeletonRow } from '@/components/ui/skeleton';
import { useToast } from '@/lib/toast-context';
import { triggerHaptic } from '@/lib/haptics';
import { notificationMeta, NOTIFICATION_VARIANT_CLASSES } from '@/lib/notification-meta';
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
  const { toast } = useToast();
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
    triggerHaptic();
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast({ title: 'Tout est marqué comme lu', variant: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la mise à jour.';
      setError(message);
      toast({ title: 'Erreur', description: message, variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const handleOpen = async (notification: AppNotification) => {
    triggerHaptic();
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
      <div className="space-y-3" role="status">
        <span className="sr-only">Chargement…</span>
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
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
          {notifications.map((notification) => {
            const meta = notificationMeta(notification.type);
            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => void handleOpen(notification)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all duration-150 active:scale-[0.98]',
                  notification.read
                    ? 'border-border bg-card'
                    : 'border-primary/40 bg-primary/5',
                )}
              >
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-full',
                    NOTIFICATION_VARIANT_CLASSES[meta.variant],
                  )}
                >
                  <Icon name={meta.icon} size="sm" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="min-w-0 text-sm font-semibold">{notification.title}</span>
                    {!notification.read ? (
                      <span
                        aria-label="Non lue"
                        className="mt-1 size-2 shrink-0 rounded-full bg-primary"
                      />
                    ) : null}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {notification.message}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {formatDateTime(notification.createdAt)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}