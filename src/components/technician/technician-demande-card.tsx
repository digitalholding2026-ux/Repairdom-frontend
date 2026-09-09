import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { DemandeStatusBadge } from '@/components/ui/status-badge';
import { Icon } from '@/components/ui/icon';
import type { TechnicianDemande } from '@/lib/api/technician-service';
import { formatRequestedTiming } from '@/lib/request-timing';
import { formatDate } from '@/lib/format';

export interface TechnicianDemandeCardProps {
  demande: TechnicianDemande;
  detailHref: string;
}

export function TechnicianDemandeCard({ demande, detailHref }: TechnicianDemandeCardProps) {
  return (
    <Link href={detailHref} className="block">
      <Card className="transition-colors hover:bg-muted/50">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <span className="font-mono text-sm font-semibold text-primary">{demande.reference}</span>
            <DemandeStatusBadge status={demande.status} context="technician" />
          </div>
          <p className="mt-2 text-sm font-medium">{demande.categoryLabel}</p>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{demande.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Icon name="pin" size="3.5" />
              {demande.city}
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="calendar" size="3.5" />
              {formatDate(demande.createdAt)}
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              {demande.requestedMode === 'SCHEDULED' ? (
                <><Icon name="calendar" size="3.5" /> {formatRequestedTiming(demande.requestedMode, demande.requestedAt)}</>
              ) : (
                <><Icon name="clock" size="3.5" /> Intervention dès que possible</>
              )}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}