'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { NotificationItem } from '@/components/ui/notification-item';
import type { AppNotification } from '@/lib/api/notifications-service';
import {
  URGENCY_LABELS,
  URGENCY_ORDER,
  getUrgencyForNotification,
  groupNotificationsByMission,
  isSectionEmpty,
  sortNotifications,
  urgencyPriority,
  type NotificationGroup,
  type NotificationRole,
  type NotificationUrgency,
} from '@/lib/notifications/notification-mapping';

/* Centre de notifications (chantier #2D).
 *
 * REMPLACE l'ancien composant (une seule implémentation, aucun doublon).
 * Toute la logique — urgence, action, regroupement, ordre des sections —
 * vit dans `notification-mapping` : ce fichier ne fait que le rendu, ce qui
 * rend les règles testables sans React.
 */

export interface NotificationsCenterProps {
  role: NotificationRole;
  notifications: AppNotification[];
  /** Marquage « lu » + navigation. Délégué à la page (accès au router). */
  onOpen: (notification: AppNotification) => void;
  /** Marquage de TOUTES les notifications comme lues. */
  onMarkAllRead: () => void;
  /** Marquage des notifications d'un seul groupe de mission. */
  onMarkGroupRead: (group: NotificationGroup) => void;
  loading?: boolean;
  error?: string | null;
  busy?: boolean;
  /** Ids arrivés en temps réel : déclenche l'animation d'insertion. */
  freshIds?: ReadonlySet<string>;
}

/* ── En-tête de section ─────────────────────────────────────────────────── */

function SectionShell({
  urgency,
  count,
  children,
}: {
  urgency: NotificationUrgency;
  count: number;
  children: React.ReactNode;
}) {
  const isAction = urgency === 'ACTION';
  return (
    <section
      aria-labelledby={`notif-section-${urgency}`}
      className={cn(
        'rounded-2xl border p-4',
        // Bloc ACTION : fond légèrement teinté + bord gauche orange.
        // Les blocs SUIVI et INFO restent neutres et discrets.
        isAction
          ? 'border-orange-500/30 border-l-4 border-l-orange-500 bg-orange-500/5'
          : 'border-border bg-card',
      )}
    >
      <h2
        id={`notif-section-${urgency}`}
        className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {isAction ? <span aria-hidden className="size-2 rounded-full bg-orange-500" /> : null}
        {URGENCY_LABELS[urgency]}
        <Badge variant={isAction ? 'warning' : 'neutral'}>{count}</Badge>
      </h2>
      {children}
    </section>
  );
}

/* ── Groupe collapsible par mission ─────────────────────────────────────── */

/**
 * Replié par défaut : seules la référence, la pastille de non-lues et la
 * dernière action sont visibles.
 *
 * Déplier ne marque RIEN comme lu : les notifications restent non lues tant
 * que l'utilisateur ne les a pas ouvertes une par une. Le compteur du
 * header reflète exactement cet état.
 */
function Group({
  group,
  role,
  onOpen,
  onMarkGroupRead,
}: {
  group: NotificationGroup;
  role: NotificationRole;
  onOpen: (notification: AppNotification) => void;
  onMarkGroupRead: (group: NotificationGroup) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  /* Menu implémenté à la main : le design system n'a ni Radix ni primitive
   * dropdown, et le chantier interdit d'ajouter une dépendance. Fermeture au
   * clic extérieur et à la touche Échap. */
  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const isAction = group.urgency === 'ACTION';

  return (
    <div
      className={cn(
        'rounded-xl border',
        isAction ? 'border-orange-500/40 bg-background' : 'border-border bg-background',
      )}
    >
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icon
            name="chevron-right"
            size="sm"
            className={cn('shrink-0 transition-transform', expanded && 'rotate-90')}
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">
              {group.reference ? `Mission ${group.reference}` : 'Mission'}
            </span>
            {group.lastActionLabel ? (
              <span className="block truncate text-xs text-muted-foreground">
                {group.lastActionLabel}
              </span>
            ) : null}
          </span>
          {group.unreadCount > 0 ? (
            <Badge variant="warning" className="shrink-0">
              {group.unreadCount} nouvelle{group.unreadCount > 1 ? 's' : ''}
            </Badge>
          ) : null}
        </button>

        <div className="relative shrink-0" ref={menuRef}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Actions du groupe"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
            disabled={group.unreadCount === 0}
          >
            <Icon name="menu" size="sm" />
          </Button>
          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  setMenuOpen(false);
                  onMarkGroupRead(group);
                }}
              >
                <Icon name="check-circle" size="sm" />
                Marquer ce groupe comme lu
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {expanded ? (
        <div className="space-y-2 border-t border-border p-2">
          {group.notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              role={role}
              onOpen={onOpen}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ── Section ────────────────────────────────────────────────────────────── */

function Section({
  urgency,
  groups,
  loose,
  role,
  onOpen,
  onMarkGroupRead,
  freshIds,
}: {
  urgency: NotificationUrgency;
  groups: NotificationGroup[];
  loose: AppNotification[];
  role: NotificationRole;
  onOpen: (notification: AppNotification) => void;
  onMarkGroupRead: (group: NotificationGroup) => void;
  freshIds: ReadonlySet<string>;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <SectionShell urgency={urgency} count={groups.length + loose.length}>
      <div className="space-y-2">
        {groups.map((group) => (
          <Group
            key={group.key}
            group={group}
            role={role}
            onOpen={onOpen}
            onMarkGroupRead={onMarkGroupRead}
          />
        ))}

        {/* Notifications SANS mission : à plat, jamais regroupées. */}
        {sortNotifications(loose).map((notification) => (
          <motion.div
            key={notification.id}
            /* Animation d'insertion (fade + slide) UNIQUEMENT pour une notif
             * reçue en temps réel. `initial={false}` = aucun mouvement au
             * premier rendu (page chargée) : sans ça, tout l'historique
             * défilerait à l'ouverture. */
            initial={
              freshIds.has(notification.id) && !reduceMotion ? { opacity: 0, y: -8 } : false
            }
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <NotificationItem
              notification={notification}
              role={role}
              onOpen={onOpen}
            />
          </motion.div>
        ))}
      </div>
    </SectionShell>
  );
}

/* ── Centre ─────────────────────────────────────────────────────────────── */

const NO_FRESH_IDS: ReadonlySet<string> = new Set<string>();

export function NotificationsCenter({
  role,
  notifications,
  onOpen,
  onMarkAllRead,
  onMarkGroupRead,
  loading = false,
  error = null,
  busy = false,
  freshIds = NO_FRESH_IDS,
}: NotificationsCenterProps) {
  if (loading) {
    return (
      <div className="space-y-4" role="status">
        <span className="sr-only">Chargement des notifications…</span>
        <SectionShell urgency="ACTION" count={0}>
          <div className="space-y-2">
            <div className="h-16 animate-pulse rounded-xl bg-muted" />
            <div className="h-16 animate-pulse rounded-xl bg-muted" />
          </div>
        </SectionShell>
      </div>
    );
  }

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const { groups, looseNotifications } = groupNotificationsByMission(notifications, role);

  /* Répartition par section. L'ordre est FIXE (ACTION → FOLLOW_UP → INFO) et
   * une section vide disparaît totalement. */
  const sections = URGENCY_ORDER.map((urgency) => {
    const priority = urgencyPriority(urgency);
    const sectionGroups = groups
      .filter((group) => group.urgency === urgency)
      .sort(
        (left, right) =>
          new Date(right.notifications[0].createdAt).getTime() -
          new Date(left.notifications[0].createdAt).getTime(),
      );
    const sectionLoose = looseNotifications.filter(
      (notification) => urgencyPriority(getUrgencyForNotification(notification)) === priority,
    );
    return { urgency, groups: sectionGroups, loose: sectionLoose };
  }).filter((section) => !isSectionEmpty(section.groups, section.loose));

  return (
    <div className="space-y-4">
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-error/40 bg-error-soft p-3 text-sm text-error-ink"
        >
          {error}
        </div>
      ) : null}

      {unreadCount > 0 ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={onMarkAllRead}
          isLoading={busy}
          disabled={busy}
        >
          <Icon name="check-circle" size="sm" />
          Tout marquer comme lu
        </Button>
      ) : null}

      {sections.length === 0 ? (
        <EmptyState
          icon={<Icon name="bell" size="lg" />}
          title="Vous êtes à jour"
          description="Aucune notification pour le moment. Les actions importantes de vos missions apparaîtront ici."
        />
      ) : (
        sections.map((section) => (
          <Section
            key={section.urgency}
            urgency={section.urgency}
            groups={section.groups}
            loose={section.loose}
            role={role}
            onOpen={onOpen}
            onMarkGroupRead={onMarkGroupRead}
            freshIds={freshIds}
          />
        ))
      )}
    </div>
  );
}