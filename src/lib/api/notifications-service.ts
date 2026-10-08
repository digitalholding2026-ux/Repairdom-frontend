import { siteConfig } from '@/lib/site-config';
import { toApiError } from './api-error';

/**
 * Données structurées d'une notification (chantier #2D).
 *
 * Miroir EXACT de `backend/src/notifications/notification-metadata.ts`. Tous
 * les montants sont des ENTIERS XAF : le formatage en FCFA est fait ici, par
 * `formatFCFA`, et nulle part ailleurs. Un montant déjà formaté en base serait
 * figé pour tous les utilisateurs.
 */
export interface AppNotificationMetadata {
  quoteId?: string;
  amountXAF?: number;
  maxAmountXAF?: number;
  currency?: string;
  technicianName?: string;
  scheduledAt?: string;
  finalAmountXAF?: number;
  city?: string;
  disputeId?: string;
  disputeCategory?: string;
  disputeStatus?: string;
  resolution?: string;
  /** Chantier #5A — décision KYC. `kycStatus` = statut après décision,
   *  `kycRejectionReason` = motif littéral saisi par l'admin (affiché tel
   *  quel), `kycAction` = action attendue (`view_missions` | `fix_kyc`). */
  kycStatus?: string;
  kycRejectionReason?: string;
  kycAction?: string;
  /** Chantier 4-FONDATIONS-C — récompenses client (modèle LTV).
   *
   *  Le #4A exposait `rewardMissions` (nombre de missions) et
   *  `rewardValueXAF` (valeur du palier) : les deux ont DISPARU, la progression
   *  porte sur la MARGE CUMULÉE. Tous les montants sont des ENTIERS à afficher
   *  via `formatFCFA`, jamais formatés ici.
   *  `rewardAction` = action attendue (`view_rewards` | `claim_credits` |
   *  `claim_nature` | `contact_support`).
   *  `rewardFraudReason` = motif littéral du signalement (`SAME_TECHNICIAN_48H`).
   *  Le commentaire libre de l'admin n'est JAMAIS exposé au client : il n'a
   *  aucun chemin jusqu'ici. */
  rewardTier?: string;
  rewardLabel?: string;
  rewardMarginXAF?: number;
  rewardNextTierXAF?: number;
  rewardCreditXAF?: number;
  rewardCreditAvailableXAF?: number;
  rewardNatureTier?: string;
  rewardNatureLabel?: string;
  rewardNatureThresholdXAF?: number;
  rewardAction?: string;
  rewardFraudReason?: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  /** Mission rattachée. `null` = notification générique (ex. `ADMIN_MESSAGE`)
   *  → affichée à plat, jamais regroupée. */
  demandeId: string | null;
  /** Référence de mission (`RD-…`). Exposée par la relation côté backend :
   *  source UNIQUE, non dupliquée dans `metadata`. `null` si la mission a été
   *  supprimée ou si la notification n'est rattachée à aucune mission. */
  reference: string | null;
  /** Données structurées, ou `null` (notification sans donnée structurée). */
  metadata: AppNotificationMetadata | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  total: number;
  unreadCount: number;
  items: AppNotification[];
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${siteConfig.apiBaseUrl}${path}`, {
    credentials: 'include',
    ...init,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw toApiError(res, body);
  return body as T;
}

export async function listNotifications(): Promise<NotificationsResponse> {
  return apiFetch<NotificationsResponse>('/notifications/mine');
}

export async function getNotificationUnreadCount(): Promise<{ unreadCount: number }> {
  return apiFetch<{ unreadCount: number }>('/notifications/unread-count');
}

export async function markNotificationRead(id: string): Promise<{ id: string; read: boolean }> {
  return apiFetch<{ id: string; read: boolean }>(`/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
  });
}

export async function markAllNotificationsRead(): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>('/notifications/read-all', { method: 'PATCH' });
}