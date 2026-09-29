'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { formatDateTime } from '@/lib/format';
import {
  formatScaleAmount,
  scaleEditHref,
  type ScalesData,
} from './use-diagnostic-scales';

/* IA-2 — barèmes sur DESKTOP : vraie table d'administration (diagnostic,
 * domaine, min/référence/max, statut, dernière modification, édition).
 * Scroll horizontal contrôlé, colonnes montants tabulaires. */

function StatusBadges({ hasActiveScale, isActive }: { hasActiveScale: boolean; isActive: boolean }) {
  return (
    <span className="flex flex-wrap gap-1">
      <Badge variant={isActive ? 'success' : 'neutral'}>{isActive ? 'Actif' : 'Inactif'}</Badge>
      <Badge variant={hasActiveScale ? 'info' : 'neutral'}>
        {hasActiveScale ? 'Barème actif' : 'Sans barème'}
      </Badge>
    </span>
  );
}

function Pagination({ data }: { data: ScalesData }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">
        {data.total} diagnostic{data.total !== 1 ? 's' : ''} — page {data.page} / {data.pages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={data.page <= 1}
          onClick={() => data.setPage(data.page - 1)}
          aria-label="Page précédente"
        >
          <Icon name="chevron-left" size="sm" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={data.page >= data.pages}
          onClick={() => data.setPage(data.page + 1)}
          aria-label="Page suivante"
        >
          <Icon name="chevron-right" size="sm" />
        </Button>
      </div>
    </div>
  );
}

export function DiagnosticScalesDesktop({ data }: { data: ScalesData }) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <caption className="sr-only">
            Barèmes par diagnostic : minimum, référence et maximum en FCFA
          </caption>
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="px-4 py-3 font-semibold">Diagnostic</th>
              <th scope="col" className="px-4 py-3 font-semibold">Domaine</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Min</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Référence</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Max</th>
              <th scope="col" className="px-4 py-3 font-semibold">Statut</th>
              <th scope="col" className="px-4 py-3 font-semibold">Modifié le</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">Éditer</span></th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((scale) => (
              <tr key={scale.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                <td className="px-4 py-3">
                  <p className="font-semibold">{scale.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {scale.problem.name} • {scale.scale.pricedInterventions}/{scale.scale.totalInterventions} intervention{scale.scale.totalInterventions !== 1 ? 's' : ''} tarifée{scale.scale.totalInterventions !== 1 ? 's' : ''}
                  </p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{scale.domain.name}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  {formatScaleAmount(scale.scale.min)}
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-primary">
                  {formatScaleAmount(scale.scale.reference)}
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  {formatScaleAmount(scale.scale.max)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadges hasActiveScale={scale.hasActiveScale} isActive={scale.isActive} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                  {scale.lastChangeAt ? formatDateTime(scale.lastChangeAt) : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={scaleEditHref(scale)} aria-label={`Modifier le barème ${scale.name}`}>
                    <Button variant="outline" size="sm">
                      <Icon name="arrow-right" size="sm" />
                      Éditer
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination data={data} />
    </div>
  );
}

export function DiagnosticScalesPagination({ data }: { data: ScalesData }) {
  return <Pagination data={data} />;
}
