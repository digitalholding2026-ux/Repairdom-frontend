import type { IconName } from '@/components/ui/icon';

export interface NotificationMeta {
  icon: IconName;
  variant: 'success' | 'info' | 'warning' | 'primary';
}

/** Correspondance type de notification backend → icône + variante de couleur. */
const NOTIFICATION_META: Record<string, NotificationMeta> = {
  // Dispatch V1 : nouvelle mission proposée au technicien (vagues 1/2).
  // Titre/message fournis par le backend ; clic → détail de la mission.
  MISSION_AVAILABLE: { icon: 'zap', variant: 'primary' },
  TECHNICIAN_ACCEPTED: { icon: 'check-circle', variant: 'success' },
  QUOTE_CREATED: { icon: 'briefcase', variant: 'info' },
  NEGOTIATION_REQUESTED: { icon: 'chat', variant: 'warning' },
  QUOTE_ACCEPTED: { icon: 'check-circle', variant: 'success' },
  QUOTE_REJECTED: { icon: 'x', variant: 'warning' },
  SCHEDULED: { icon: 'calendar', variant: 'primary' },
  COMPLETED: { icon: 'badge-check', variant: 'success' },
  CONFIRMED: { icon: 'shield-check', variant: 'success' },
};

const FALLBACK: NotificationMeta = { icon: 'bell', variant: 'info' };

export function notificationMeta(type: string): NotificationMeta {
  return NOTIFICATION_META[type] ?? FALLBACK;
}

export const NOTIFICATION_VARIANT_CLASSES: Record<NotificationMeta['variant'], string> = {
  success: 'bg-success-soft text-success-ink',
  info: 'bg-info-soft text-info-ink',
  warning: 'bg-warning-soft text-warning-ink',
  primary: 'bg-primary/10 text-primary',
};