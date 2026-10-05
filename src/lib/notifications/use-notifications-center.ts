'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/lib/api/notifications-service';
import { useUserStream } from '@/lib/realtime/use-user-stream';
import { toUserErrorMessage } from '@/lib/ui-error-message';
import { triggerHaptic } from '@/lib/haptics';
import { useToast } from '@/lib/toast-context';
import {
  getActionForNotification,
  hasNavigableAction,
  type NotificationGroup,
  type NotificationRole,
} from '@/lib/notifications/notification-mapping';

/**
 * Logique du centre de notifications, partagée par les pages client et
 * technicien (chantier #2D).
 *
 * Extraite du composant pour que les deux pages n'aient AUCUNE logique
 * dupliquée : une seule implémentation de la mise à jour optimiste, du
 * marquage et de l'insertion temps réel.
 */
export function useNotificationsCenter(role: NotificationRole) {
  const router = useRouter();
  const { toast } = useToast();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Ids reçus en temps réel → animation d'insertion (200 ms). */
  const [freshIds, setFreshIds] = useState<ReadonlySet<string>>(new Set<string>());
  /** Ids déjà vus : permet de distinguer « première apparition » d'une
   *  notification réellement nouvelle. */
  const seenIds = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await listNotifications();
      /* Une notification est « fraîche » seulement si elle n'avait JAMAIS été
       * chargée dans ce montage. Sans cette comparaison, le premier
       * chargement animerait tout l'historique. */
      const previous = seenIds.current;
      const arrived = previous
        ? res.items.filter((item) => !previous.has(item.id)).map((item) => item.id)
        : [];
      seenIds.current = new Set(res.items.map((item) => item.id));
      if (arrived.length > 0) {
        setFreshIds(new Set(arrived));
        /* La marque s'efface après l'animation : une notification ne doit pas
         * rester « nouvelle » indéfiniment si l'utilisateur ne bouge pas. */
        window.setTimeout(() => setFreshIds(new Set<string>()), 1200);
      }
      setNotifications(res.items);
      setUnreadCount(res.unreadCount);
      setError(null);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Erreur lors du chargement des notifications.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* TEMPS RÉEL (#2A — non modifié) : on ne recharge que sur un événement
   * `notification.created`. L'ancien composant rechargeait sur TOUT événement
   * du flux utilisateur, ce qui provoquait des requêtes inutiles. */
  useUserStream((message) => {
    if (message.type !== 'notification.created') return;
    void load();
  });

  /** Marquage optimiste : l'UI change tout de suite, le serveur suit. */
  const markReadLocally = useCallback((notification: AppNotification) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === notification.id ? { ...item, read: true } : item)),
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  }, []);

  const handleOpen = useCallback(
    async (notification: AppNotification) => {
      triggerHaptic();
      const action = getActionForNotification(notification, role);
      if (!notification.read) {
        markReadLocally(notification);
        try {
          await markNotificationRead(notification.id);
        } catch {
          /* La navigation reste possible si le marquage échoue : ne pas
           * bloquer l'utilisateur sur un simple "lu". */
        }
      }
      if (hasNavigableAction(action) && action.href) {
        router.push(action.href);
      }
    },
    [markReadLocally, role, router],
  );

  const handleMarkAllRead = useCallback(async () => {
    setBusy(true);
    setError(null);
    triggerHaptic();
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
      toast({ title: 'Tout est marqué comme lu', variant: 'success' });
    } catch (err) {
      const message = toUserErrorMessage(err, 'Erreur lors de la mise à jour.');
      setError(message);
      toast({ title: 'Erreur', description: message, variant: 'error' });
    } finally {
      setBusy(false);
    }
  }, [toast]);

  /**
   * « Marquer ce groupe comme lu ».
   *
   * Le backend n'expose pas d'endpoint de groupe (et le chantier interdit
   * d'en créer un) : on marque donc chaque notification non lue du groupe via
   * l'endpoint unitaire, en parallèle. `Promise.allSettled` pour qu'une
   * notification en échec n'annule pas les autres — un groupe partiellement
   * lu est un état acceptable et l'utilisateur voit le compteur exact.
   */
  const handleMarkGroupRead = useCallback(
    async (group: NotificationGroup) => {
      const unread = group.notifications.filter((item) => !item.read);
      if (unread.length === 0) return;
      triggerHaptic();
      for (const notification of unread) markReadLocally(notification);
      const results = await Promise.allSettled(
        unread.map((notification) => markNotificationRead(notification.id)),
      );
      const failed = results.filter((result) => result.status === 'rejected').length;
      if (failed > 0) {
        const message = `${failed} notification${failed > 1 ? 's' : ''} n’ont pas pu être marquée${
          failed > 1 ? 's' : ''
        } comme lue${failed > 1 ? 's' : ''}. Réessayez.`;
        setError(message);
        toast({ title: 'Marquage partiel', description: message, variant: 'error' });
        // Resynchronise avec l'état réel du serveur.
        void load();
      }
    },
    [load, markReadLocally, toast],
  );

  const onMarkAllRead = useCallback(() => {
    void handleMarkAllRead();
  }, [handleMarkAllRead]);

  const onMarkGroupRead = useCallback(
    (group: NotificationGroup) => {
      void handleMarkGroupRead(group);
    },
    [handleMarkGroupRead],
  );

  const centerProps = useMemo(
    () => ({ role, notifications, onOpen: handleOpen }),
    [handleOpen, notifications, role],
  );

  return {
    centerProps,
    loading,
    error,
    busy,
    freshIds,
    unreadCount,
    onMarkAllRead,
    onMarkGroupRead,
  };
}