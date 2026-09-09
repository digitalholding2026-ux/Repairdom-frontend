import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import { formatDate, formatDateTime } from '@/lib/format';
import { formatRequestedTiming } from '@/lib/request-timing';

export interface MissionInfoProps {
  description: string;
  city: string;
  requestedMode: string | null;
  requestedAt: string | null;
  createdAt: string;
  scheduledAt: string | null;
}

function InfoRow({ icon, label, children }: { icon: IconName; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon name={icon} size="sm" strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

export function MissionInfo({
  description,
  city,
  requestedMode,
  requestedAt,
  createdAt,
  scheduledAt,
}: MissionInfoProps) {
  return (
    <div className="grid gap-2">
      <InfoRow icon="file" label="Description">
        <p className="whitespace-pre-line">{description}</p>
      </InfoRow>
      <InfoRow icon="pin" label="Localisation">
        <p className="font-medium">{city}</p>
      </InfoRow>
      <InfoRow icon={requestedMode === 'SCHEDULED' ? 'calendar' : 'alert'} label="Intervention souhaitée">
        <p className="font-medium">{formatRequestedTiming(requestedMode, requestedAt)}</p>
      </InfoRow>
      <InfoRow icon="clock" label="Date de la demande">
        <p>{formatDate(createdAt)}</p>
      </InfoRow>
      {scheduledAt ? (
        <InfoRow icon="check-circle" label="Rendez-vous prévu">
          <p className="font-medium">{formatDateTime(scheduledAt)}</p>
        </InfoRow>
      ) : null}
    </div>
  );
}