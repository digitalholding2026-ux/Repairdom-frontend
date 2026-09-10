import { Timeline, type TimelineStep } from '@/components/ui/timeline';
import type { IconName } from '@/components/ui/icon';
import type { MissionEvent } from '@/lib/api/mission-events-service';
import { formatDateTime } from '@/lib/format';

const EVENT_ICONS: Record<string, IconName> = {
  CREATED: 'file',
  TECHNICIAN_ASSIGNED: 'users',
  TECHNICIAN_ACCEPTED: 'badge-check',
  DIAGNOSTIC_SELECTED: 'search',
  QUOTE_CREATED: 'file',
  NEGOTIATION_REQUESTED: 'chat',
  QUOTE_ACCEPTED: 'check',
  QUOTE_REJECTED: 'x',
  SCHEDULED: 'calendar',
  IN_PROGRESS: 'wrench',
  COMPLETED: 'check-circle',
  CONFIRMED: 'badge-check',
  CANCELED: 'x',
};

export interface MissionTimelineProps {
  events: MissionEvent[];
  className?: string;
}

/** Chronologie de la mission (récapitulatif client et technicien). */
export function MissionTimeline({ events, className }: MissionTimelineProps) {
  if (events.length === 0) return null;

  const steps: TimelineStep[] = events.map((event) => {
    const actor = event.actor;
    return {
      id: event.id,
      title: event.label,
      icon: event.type in EVENT_ICONS ? EVENT_ICONS[event.type] : 'clock',
      state: 'done',
      timestamp: event.createdAt ? formatDateTime(event.createdAt) : undefined,
      description: actor ? `${actor.firstName} ${actor.lastName ?? ''}`.trim() : undefined,
    };
  });

  return <Timeline steps={steps} className={className} />;
}