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
import { toUserErrorMessage } from '@/lib/ui-error-message';
import { triggerHaptic } from '@/lib/haptics';
import { notificationMeta, NOTIFICATION_VARIANT_CLASSES } from '@/lib/notification-meta';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/lib/api/notifications-service';
import { formatDateTime, formatRelative, formatTime } from '@/lib/format';
import { Badge } from '@/components/ui/badge';

export interface NotificationsCenterProps {
  detailHref: (demandeId: string) => string;
  /** Variante hub (espace client) : conteneur texturé, en-tête avec badge
   *  et action globale, filtres par catégorie. */
  hub?: boolean;
}

type HubFilter = 'ALL' | 'UNREAD' | 'MISSIONS' | 'FINANCE';

const HUB_FILTERS: Array<{ id: HubFilter; label: string }> = [
  { id: 'ALL', label: 'Toutes' },
  { id: 'UNREAD', label: 'Non lues' },
  { id: 'MISSIONS', label: 'Missions' },
  { id: 'FINANCE', label: 'Solde & Financement' },
];

/* Types backend liés au solde (recharges / retraits). */
const FINANCE_NOTIFICATION_TYPES = new Set([
  'TOPUP_CONFIRMED',
  'TOPUP_FAILED',
  'TOPUP_CANCELLED',
  'WITHDRAWAL_CONFIRMED',
  'WITHDRAWAL_FAILED',
  'WITHDRAWAL_CANCELLED',
  'CLIENT_TOPUP',
  'CLIENT_WITHDRAWAL',
]);

function isFinanceNotification(notification: AppNotification): boolean {
  return FINANCE_NOTIFICATION_TYPES.has(notification.type);
}

function matchesHubFilter(notification: AppNotification, filter: HubFilter): boolean {
  switch (filter) {
    case 'UNREAD':
      return !notification.read;
    case 'MISSIONS':
      return notification.demandeId != null && !isFinanceNotification(notification);
    case 'FINANCE':
      return isFinanceNotification(notification);
    default:
      return true;
  }
}

/* Icône thématique de la variante hub : devis (bleu), mission (émeraude),
 * solde (violet), sinon correspondance par type. */
function hubIconTheme(type: string): { icon: 'file' | 'check-circle' | 'wallet'; className: string } | null {
  if (FINANCE_NOTIFICATION_TYPES.has(type)) {
    return { icon: 'wallet', className: 'bg-purple-500/10 text-purple-600' };
  }
  switch (type) {
    case 'QUOTE_CREATED':
    case 'NEGOTIATION_REQUESTED':
    case 'QUOTE_ACCEPTED':
    case 'QUOTE_REJECTED':
      return { icon: 'file', className: 'bg-primary/10 text-primary' };
    case 'TECHNICIAN_ACCEPTED':
    case 'SCHEDULED':
    case 'COMPLETED':
    case 'CONFIRMED':
    case 'MISSION_AVAILABLE':
      return { icon: 'check-circle', className: 'bg-emerald-500/10 text-emerald-600' };
    default:
      return null;
  }
}

/** Centre de notifications (historique read-only + gestion du lu). */
export function NotificationsCenter({ detailHref, hub = false }: NotificationsCenterProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<HubFilter>('ALL');

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
      const message = toUserErrorMessage(err, 'Erreur lors de la mise à jour.');
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

  if (!hub) {
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

  const visibleNotifications = notifications.filter((notification) =>
    matchesHubFilter(notification, filter),
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-relio-card lg:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-gradient-to-br from-relio-orange/10 via-relio-orange-bright/10 to-transparent blur-3xl"
      />
      <div className="relative space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Notifications</h1>
            {unreadCount > 0 ? (
              <Badge variant="info">
                {unreadCount} non lue{unreadCount !== 1 ? 's' : ''}
              </Badge>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleMarkAllRead()}
            disabled={busy || unreadCount === 0}
            isLoading={busy}
          >
            <Icon name="check-circle" size="sm" />
            Tout marquer comme lu
          </Button>
        </div>

        <div
          role="tablist"
          aria-label="Filtrer les notifications"
          className="mb-6 inline-flex gap-1 rounded-xl border border-slate-200/50 bg-slate-100 p-1 dark:border-slate-700/50 dark:bg-slate-800/80"
        >
          {HUB_FILTERS.map((item) => {
            const active = item.id === filter;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(item.id)}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'bg-white text-primary shadow-xs dark:bg-slate-900'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {error ? <Alert variant="error">{error}</Alert> : null}

        {visibleNotifications.length === 0 ? (
          <EmptyState
            icon={<Icon name="bell" size="lg" />}
            title="Aucune notification"
            description="Vous êtes à jour ! Les mises à jour de vos demandes et devis apparaîtront ici."
          />
        ) : (
          <div className="space-y-3">
            {visibleNotifications.map((notification) => {
              const theme = hubIconTheme(notification.type);
              const meta = notificationMeta(notification.type);
              const iconName = theme?.icon ?? meta.icon;
              const iconClassName = theme?.className ?? NOTIFICATION_VARIANT_CLASSES[meta.variant];
              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => void handleOpen(notification)}
                  className={cn(
                    'group flex w-full cursor-pointer items-start gap-4 rounded-xl border p-4 text-left transition-all duration-200 active:scale-[0.99]',
                    notification.read
                      ? 'border-slate-200/60 bg-slate-50/50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/40'
                      : 'border-primary/20 bg-primary/5 hover:border-primary/40 dark:bg-primary/10',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      iconClassName,
                    )}
                  >
                    <Icon name={iconName} size="sm" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center text-sm font-semibold text-slate-900 dark:text-white">
                      <span className="truncate">{notification.title}</span>
                      {!notification.read ? (
                        <span
                          aria-label="Non lue"
                          className="ml-2 inline-block size-2 shrink-0 animate-pulse rounded-full bg-primary"
                        />
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-600 dark:text-slate-300 lg:text-sm">
                      {notification.message}
                    </span>
                    <span className="mt-2 flex items-center gap-1 text-2xs text-slate-400 dark:text-slate-500">
                      <Icon name="clock" size="3.5" />
                      {formatRelative(notification.createdAt)} · {formatTime(notification.createdAt)}
                    </span>
                  </span>
                  <Icon
                    name="arrow-right"
                    size="sm"
                    className="mt-1 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}