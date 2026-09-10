'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { DemandeStatusBadge } from '@/components/ui/status-badge';
import { getMissionSummary, type MissionSummary } from '@/lib/api/summary-service';
import { formatDateTime } from '@/lib/format';
import { categoryLabel } from '@/lib/technician-profile';

interface MissionSummaryCardProps {
  demandeId: string;
  title?: string;
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: 'badge-check' | 'file' | 'users' | 'calendar' | 'pin' | 'phone' | 'wrench' | 'clock';
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon name={icon} size="sm" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm whitespace-pre-line">{value}</p>
      </div>
    </div>
  );
}

export function MissionSummaryCard({ demandeId, title = 'Récapitulatif de la mission' }: MissionSummaryCardProps) {
  const [summary, setSummary] = useState<MissionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getMissionSummary(demandeId)
      .then((data) => {
        if (active) setSummary(data);
      })
      .catch(() => {
        if (active) setSummary(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [demandeId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon name="file" size="sm" className="text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : summary ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-sm font-semibold text-primary">{summary.reference}</span>
              <DemandeStatusBadge status={summary.status} context="client" />
            </div>
            <SummaryRow icon="wrench" label="Catégorie" value={categoryLabel(summary.category)} />
            <SummaryRow icon="file" label="Problème" value={summary.description} />
            {summary.technician ? (
              <SummaryRow
                icon="users"
                label="Technicien"
                value={`${summary.technician.firstName} ${summary.technician.lastName ?? ''}`.trim()}
              />
            ) : null}
            {summary.diagnostic ? (
              <SummaryRow icon="badge-check" label="Diagnostic" value={summary.diagnostic.content} />
            ) : null}
            {summary.quote && summary.quote.status === 'ACCEPTED' ? (
              <SummaryRow
                icon="badge-check"
                label="Tarif accepté"
                value={`${summary.quote.amount.toLocaleString('fr-FR')} ${summary.quote.currency}`}
              />
            ) : null}
            {summary.scheduledAt ? (
              <SummaryRow icon="calendar" label="Rendez-vous" value={formatDateTime(summary.scheduledAt)} />
            ) : null}
            <SummaryRow
              icon="pin"
              label="Lieu de l'intervention"
              value={[
                summary.location.city,
                summary.location.neighborhood,
                summary.location.address,
                summary.location.landmark,
              ]
                .filter(Boolean)
                .join(' — ')}
            />
            {summary.location.contactPhone ? (
              <SummaryRow icon="phone" label="Contact" value={summary.location.contactPhone} />
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
