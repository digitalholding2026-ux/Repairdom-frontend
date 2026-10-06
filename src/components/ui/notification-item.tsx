'use client';

import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { formatFCFA } from '@/lib/format-fcfa';
import { formatRelative } from '@/lib/format';
import { notificationMeta } from '@/lib/notification-meta';
import {
  getActionForNotification,
  getUrgencyForNotification,
  hasNavigableAction,
  type NotificationRole,
  type NotificationUrgency,
} from '@/lib/notifications/notification-mapping';
import type { AppNotification } from '@/lib/api/notifications-service';

/* Élément unitaire du centre de notifications (chantier #2D).
 *
 * Deux responsabilités distinctes :
 *  - le CORPS de la notification est cliquable et marque comme lu ;
 *  - le BOUTON D'ACTION navigue. Il marque aussi comme lu (décision UX :
 *    cliquer « Voir le devis » puis revenir et trouver encore la pastille
 *    orange est incohérent).
 */

export interface NotificationItemProps {
  notification: AppNotification;
  role: NotificationRole;
  /** Marque la notification comme lue (optimiste côté parent). */
  onOpen: (notification: AppNotification) => void;
}

/** Classes du point « non lue ». Un seul point, toujours à gauche. */
const UNREAD_DOT_CLASS = 'bg-orange-500';

/**
 * Ligne de montant formatée en FCFA, ou `null` si la notification n'a pas de
 * montant exploitable.
 *
 * Toute valeur affichée vient de `formatFCFA` : jamais de `toLocaleString`
 * local, jamais de « XAF ». Les montants sont des ENTIERS XAF côté backend.
 */
function amountLine(notification: AppNotification): string | null {
  const metadata = notification.metadata;
  if (!metadata) return null;
  const parts: string[] = [];

  // Devis proposé au client : montant du devis.
  if (typeof metadata.amountXAF === 'number') parts.push(formatFCFA(metadata.amountXAF));

  // Confirmation de mission côté technicien : montant final net.
  if (typeof metadata.finalAmountXAF === 'number') {
    parts.push(`${formatFCFA(metadata.finalAmountXAF)} nets`);
  }

  // Avertissement tarifaire : montant proposé vs barème recommandé.
  if (typeof metadata.maxAmountXAF === 'number') {
    parts.push(`Barème : ${formatFCFA(metadata.maxAmountXAF)}`);
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

/** Infos contextuelles (date de rendez-vous, ville, technicien, décision). */
function contextLine(notification: AppNotification): string | null {
  const metadata = notification.metadata;
  if (!metadata) return null;
  const parts: string[] = [];

  if (metadata.scheduledAt) {
    const date = new Date(metadata.scheduledAt);
    if (!Number.isNaN(date.getTime())) {
      parts.push(`Rendez-vous le ${date.toLocaleDateString('fr-FR')}`);
    }
  }
  if (metadata.city) parts.push(metadata.city);
  if (metadata.technicianName) parts.push(metadata.technicianName);
  if (metadata.disputeStatus) parts.push(`Litige : ${metadata.disputeStatus}`);
  if (metadata.resolution) parts.push(metadata.resolution);
  /* Chantier #5A — motif de rejet KYC. Affiché tel quel : c'est la seule
   * information qui dit au technicien QUOI corriger, et elle est trop longue
   * pour tenir dans le `message` générique (qui reste volontairement fixe). */
  if (metadata.kycRejectionReason) parts.push(`Motif : ${metadata.kycRejectionReason}`);

  return parts.length > 0 ? parts.join(' · ') : null;
}

/** Icône : priorité au thème d'urgence, sinon l'icône thématique existante. */
function iconFor(urgency: NotificationUrgency, type: string): { icon: IconName; className: string } {
  if (urgency === 'ACTION') {
    return { icon: 'alert', className: 'bg-orange-500/10 text-orange-600' };
  }
  const meta = notificationMeta(type);
  if (urgency === 'FOLLOW_UP') {
    return { icon: meta.icon, className: 'bg-info-soft text-info-ink' };
  }
  return { icon: meta.icon, className: 'bg-muted text-muted-foreground' };
}

export function NotificationItem({ notification, role, onOpen }: NotificationItemProps) {
  const urgency = getUrgencyForNotification(notification);
  const action = getActionForNotification(notification, role);
  const navigable = hasNavigableAction(action);
  const { icon, className } = iconFor(urgency, notification.type);
  const amounts = amountLine(notification);
  const context = contextLine(notification);

  const handleAction = (event: React.MouseEvent<HTMLButtonElement>) => {
    /* Le bouton est à l'intérieur du corps cliquable : on empêche la
     * propagation pour éviter un double marquage / double navigation. */
    event.stopPropagation();
    onOpen(notification);
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border p-3 transition-colors',
        notification.read ? 'border-border bg-card' : 'border-orange-500/30 bg-orange-500/5',
      )}
    >
      {/* Point « non lue » : à GAUCHE, toujours dans le même colonne, pour
          que l'œil puisse scanner la colonne sans lire le texte. */}
      <span className="flex size-4 shrink-0 items-center justify-center pt-1.5">
        {!notification.read ? (
          <span
            aria-label="Non lue"
            className={cn('size-2 rounded-full', UNREAD_DOT_CLASS)}
          />
        ) : null}
      </span>

      <button
        type="button"
        onClick={() => onOpen(notification)}
        className="flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full',
            className,
          )}
        >
          <Icon name={icon} size="sm" strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="min-w-0 text-sm font-semibold">{notification.title}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatRelative(notification.createdAt)}
            </span>
          </span>
          <span className="mt-0.5 block text-sm text-muted-foreground">
            {notification.message}
          </span>
          {/* Montants : TOUJOURS formatés par `formatFCFA`. */}
          {amounts ? (
            <span className="mt-1 block text-sm font-semibold text-foreground">{amounts}</span>
          ) : null}
          {context ? (
            <span className="mt-0.5 block text-xs text-muted-foreground">{context}</span>
          ) : null}
        </span>
      </button>

      {/* Bouton d'action contextuel. Absent si le type n'a pas de mapping :
          le marquage « lu » reste accessible via le corps. */}
      {action && action.label ? (
        <Button
          type="button"
          variant={urgency === 'ACTION' ? 'primary' : 'secondary'}
          size="sm"
          className="shrink-0 self-center"
          onClick={handleAction}
        >
          {action.label}
          {navigable ? <Icon name="arrow-right" size="sm" /> : null}
        </Button>
      ) : null}
    </div>
  );
}