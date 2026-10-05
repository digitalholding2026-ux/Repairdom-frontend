import type { AppNotification } from '@/lib/api/notifications-service';

/**
 * Mapping centralisé du centre de notifications (chantier #2D).
 *
 * SOURCE UNIQUE : aucune décision d'affichage (urgence, action, route,
 * icône) n'est prise dans un composant. Ce module est testable sans React et
 * sans rendu, ce qui permet de garantir que le backend et le frontend ne
 * divergent pas sur ce qui est affiché.
 *
 * Invariant FCFA : ce module ne formate AUCUN montant. Il ne fait que
 * choisir quoi afficher ; la conversion en FCFA est faite par `formatFCFA`
 * à partir des entiers XAF de `metadata`.
 */

/** Rôles servis par le centre de notifications. */
export type NotificationRole = 'CLIENT' | 'TECHNICIAN' | 'ADMIN';

/**
 * Niveaux d'urgence : l'ordre des sections est FIXE (ACTION → SUIVI → INFO).
 * Le nombre contrôle l'ordre de tri, pas seulement un tri alphabétique.
 */
export type NotificationUrgency = 'ACTION' | 'FOLLOW_UP' | 'INFO';

/** Ordre d'affichage des sections. Toute section vide disparaît. */
export const URGENCY_ORDER: readonly NotificationUrgency[] = ['ACTION', 'FOLLOW_UP', 'INFO'];

/** Libellés de section. */
export const URGENCY_LABELS: Record<NotificationUrgency, string> = {
  ACTION: 'Actions requises',
  FOLLOW_UP: 'Suivi',
  INFO: 'Info',
};

/**
 * Urgence par type. TOTALITÉ de `NotificationType` (15 valeurs du backend).
 *
 * L'urgence est portée par le TYPE et non par le rôle : un même événement
 * demande la même chose à tous. Le rôle n'intervient que pour l'ACTION (voir
 * `getActionForNotification`), car l'action possible dépend de qui reçoit la
 * notification.
 */
const URGENCY_BY_TYPE: Record<string, NotificationUrgency> = {
  // ── ACTION : une action est attendue de l'utilisateur ──
  QUOTE_CREATED: 'ACTION',
  NEGOTIATION_REQUESTED: 'ACTION',
  COMPLETED: 'ACTION',
  PRICING_WARNING: 'ACTION',
  DISPUTE_OPENED: 'ACTION',
  CONVERSATION_FLAG: 'ACTION',
  // ── SUIVI : information sur un changement en cours ──
  TECHNICIAN_ACCEPTED: 'FOLLOW_UP',
  TECHNICIAN_EN_ROUTE: 'FOLLOW_UP',
  TECHNICIAN_ARRIVED: 'FOLLOW_UP',
  QUOTE_ACCEPTED: 'FOLLOW_UP',
  QUOTE_REJECTED: 'FOLLOW_UP',
  SCHEDULED: 'FOLLOW_UP',
  CONFIRMED: 'FOLLOW_UP',
  // ── INFO : historique ou secondaire ──
  MISSION_AVAILABLE: 'INFO',
  ADMIN_MESSAGE: 'INFO',
  DISPUTE_RESOLVED: 'INFO',
};

/**
 * Urgence d'une notification.
 *
 * Type inconnu → `INFO` : la dégradation est sûre (une notif mal classée
 * atterrit en bas de page) alors qu'un `ACTION` par défaut mettrait en tête
 * une notif qui n'appelle aucune action.
 */
export function getUrgencyForNotification(notification: AppNotification): NotificationUrgency {
  return URGENCY_BY_TYPE[notification.type] ?? 'INFO';
}

/** Variante d'urgence → priorité d'affichage. */
export function urgencyPriority(urgency: NotificationUrgency): number {
  return URGENCY_ORDER.indexOf(urgency);
}

/** Action contextuelle : libellé + lien. */
export interface NotificationAction {
  label: string;
  /** Route absolue côté app. `null` = aucune navigation possible. */
  href: string | null;
}

/**
 * Aucune action : le composant n'affichera alors pas de bouton, seulement
 * « Marquer comme lu ». Utilisé pour tout type sans mapping.
 */
const NO_ACTION: NotificationAction = { label: '', href: null };

/** Construit le lien d'une mission. `null` si la notification n'en a pas. */
function missionHref(
  notification: AppNotification,
  base: '/client/demandes' | '/technicien/demandes',
): string | null {
  return notification.demandeId ? `${base}/${notification.demandeId}` : null;
}

/**
 * Action contextuelle par type ET rôle.
 *
 * Rôle → préfixe de mission : un client n'a pas accès à `/technicien/...` et
 * inversement. `ADMIN_MESSAGE` (notif générique sans mission) est l'unique
 * cas où le lien est indépendant de `demandeId`.
 *
 * Les ancres (`#chat`, `#map`, `#confirm`) sont conservées telles quelles :
 * elles correspondent aux zones de la page détail de mission. Tant que la
 * page ne porte pas ces ancres, le hash est simplement inerte — la navigation
 * reste correcte.
 */
export function getActionForNotification(
  notification: AppNotification,
  role: NotificationRole,
): NotificationAction | null {
  const clientMission = missionHref(notification, '/client/demandes');
  const techMission = missionHref(notification, '/technicien/demandes');

  switch (notification.type) {
    case 'QUOTE_CREATED':
      // Valider un devis n'est possible qu'au client.
      return role === 'CLIENT' && clientMission
        ? { label: 'Voir le devis', href: clientMission }
        : NO_ACTION;

    case 'QUOTE_ACCEPTED':
    case 'QUOTE_REJECTED':
      // Le technicien doit ouvrir la mission pour suite.
      return role === 'TECHNICIAN' && techMission
        ? { label: 'Voir la mission', href: techMission }
        : NO_ACTION;

    case 'NEGOTIATION_REQUESTED':
      // Répondre = revenir dans la conversation de la mission.
      return role === 'TECHNICIAN' && techMission
        ? { label: 'Répondre', href: `${techMission}#chat` }
        : NO_ACTION;

    case 'PRICING_WARNING':
      // L'avertissement porte sur le devis de la mission : c'est là que le
      // technicien justifie son tarif.
      return role === 'TECHNICIAN' && techMission
        ? { label: 'Justifier', href: techMission }
        : NO_ACTION;

    case 'TECHNICIAN_EN_ROUTE':
    case 'TECHNICIAN_ARRIVED':
      // Suivi temps réel de l'arrivée du technicien.
      return role === 'CLIENT' && clientMission
        ? { label: 'Voir la carte', href: `${clientMission}#map` }
        : NO_ACTION;

    case 'COMPLETED':
      // Le client doit confirmer la fin de la mission.
      return role === 'CLIENT' && clientMission
        ? { label: 'Confirmer la fin', href: `${clientMission}#confirm` }
        : NO_ACTION;

    case 'CONFIRMED':
      // Le technicien veut voir ce que la mission lui rapporte.
      return role === 'TECHNICIAN'
        ? { label: 'Voir mes revenus', href: '/technicien/revenus' }
        : NO_ACTION;

    case 'MISSION_AVAILABLE':
      // Liste des missions disponibles : pas d'ancrage sur une mission
      // précise, plusieurs missions sont notifiées à la fois.
      return role === 'TECHNICIAN'
        ? { label: 'Voir les missions', href: '/technicien/demandes' }
        : NO_ACTION;

    case 'TECHNICIAN_ACCEPTED':
    case 'SCHEDULED':
      return role === 'CLIENT' && clientMission
        ? { label: 'Voir la mission', href: clientMission }
        : NO_ACTION;

    case 'DISPUTE_OPENED':
      // Ouverture d'un litige : l'admin doit traiter le dossier.
      return role === 'ADMIN'
        ? {
            label: 'Ouvrir le litige',
            href: clientMission ? `/admin/litiges/${notification.demandeId}` : '/admin/litiges',
          }
        : NO_ACTION;

    case 'DISPUTE_RESOLVED':
      // La décision se consulte sur la mission, quel que soit le rôle.
      if (role === 'CLIENT' && clientMission) {
        return { label: 'Voir la décision', href: clientMission };
      }
      if (role === 'TECHNICIAN' && techMission) {
        return { label: 'Voir la décision', href: techMission };
      }
      return NO_ACTION;

    case 'CONVERSATION_FLAG':
      // Signal à examiner depuis l'espace assistant (seule surface admin
      // liée à la surveillance de conversation).
      return role === 'ADMIN' ? { label: 'Voir le signal', href: '/admin/assistant' } : NO_ACTION;

    case 'ADMIN_MESSAGE':
      // Notification générique sans mission : la lecture se fait sur place.
      return { label: 'Lire', href: '/technicien/notifications' };

    default:
      // Type inconnu (le backend peut en ajouter) : aucun bouton de
      // navigation, seulement le marquage lu. Jamais de lien deviné.
      return NO_ACTION;
  }
}

/** Une action propose-t-elle réellement une navigation ? */
export function hasNavigableAction(action: NotificationAction | null): action is NotificationAction {
  return action !== null && action.href !== null;
}

/* ── Regroupement par mission ───────────────────────────────────────────── */

/** Un groupe de notifications rattachées à une même mission. */
export interface NotificationGroup {
  /** Clé de regroupement = `demandeId`. */
  key: string;
  /** Référence affichée, ou repli lisible si la mission a été supprimée. */
  reference: string | null;
  notifications: AppNotification[];
  unreadCount: number;
  /** Libellé de la dernière action (notification la plus récente). */
  lastActionLabel: string | null;
  /** Urgence dominante : la plus haute du groupe. */
  urgency: NotificationUrgency;
}

/**
 * Regroupe par mission.
 *
 * Les notifications SANS `demandeId` ne sont PAS regroupées : `ADMIN_MESSAGE`
 * est générique et ne concerne pas une mission. Elles remontent dans
 * `looseNotifications`, à plat dans leur section.
 */
export function groupNotificationsByMission(
  notifications: AppNotification[],
  role: NotificationRole,
): { groups: NotificationGroup[]; looseNotifications: AppNotification[] } {
  const byMission = new Map<string, AppNotification[]>();
  const looseNotifications: AppNotification[] = [];

  for (const notification of notifications) {
    if (!notification.demandeId) {
      looseNotifications.push(notification);
      continue;
    }
    const bucket = byMission.get(notification.demandeId);
    if (bucket) bucket.push(notification);
    else byMission.set(notification.demandeId, [notification]);
  }

  const groups: NotificationGroup[] = [];
  for (const [key, items] of byMission) {
    /* `items` est déjà trié du plus récent au plus ancien (ordre de l'API) :
     * le premier élément est donc la dernière action. */
    const mostRecent = items[0];
    groups.push({
      key,
      reference: mostRecent.reference ?? items.find((item) => item.reference)?.reference ?? null,
      notifications: items,
      unreadCount: items.filter((item) => !item.read).length,
      lastActionLabel: getActionForNotification(mostRecent, role)?.label || null,
      urgency: items.reduce<NotificationUrgency>(
        (highest, item) =>
          urgencyPriority(getUrgencyForNotification(item)) < urgencyPriority(highest)
            ? getUrgencyForNotification(item)
            : highest,
        'INFO',
      ),
    });
  }

  return { groups, looseNotifications };
}

/* ── Tri d'une section ──────────────────────────────────────────────────── */

/**
 * Trie une section : groupes d'abord (par dernière action), notifications à
 * plat ensuite. Tri décroissant sur `createdAt` — la liste de l'API est déjà
 * triée, on ne fait donc que stabiliser l'ordre après regroupement.
 */
export function sortNotifications(
  notifications: AppNotification[],
): AppNotification[] {
  return [...notifications].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

/** Une section est-elle vide ? (une section vide ne s'affiche pas) */
export function isSectionEmpty(
  groups: NotificationGroup[],
  loose: AppNotification[],
): boolean {
  return groups.length === 0 && loose.length === 0;
}