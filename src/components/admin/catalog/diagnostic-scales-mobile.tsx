'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { formatDateTime } from '@/lib/format';
import {
  formatScaleAmount,
  scaleEditHref,
  type ScalesData,
} from './use-diagnostic-scales';

/* IA-2 — prix courants sur MOBILE : cartes tactiles (essentiel + édition ≥ 44 px).
 * Mêmes données et mêmes règles que la table desktop. */

export function DiagnosticScalesMobile({ data }: { data: ScalesData }) {
  return (
    <div className="space-y-3">
      {data.items.map((scale) => (
        <Card key={scale.id}>
          <CardContent className="space-y-2 py-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{scale.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {scale.domain.name} • {scale.problem.name}
                </p>
              </div>
              <span className="flex shrink-0 flex-wrap justify-end gap-1">
                <Badge variant={scale.isActive ? 'success' : 'neutral'}>
                  {scale.isActive ? 'Actif' : 'Inactif'}
                </Badge>
                <Badge variant={scale.hasActiveScale ? 'info' : 'neutral'}>
                  {scale.hasActiveScale ? 'Prix courant' : 'Sans prix courant'}
                </Badge>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-2.5 text-center tabular-nums">
              <div>
                <p className="text-2xs uppercase tracking-wide text-muted-foreground">Min</p>
                <p className="text-sm font-bold">{formatScaleAmount(scale.scale.min)}</p>
              </div>
              <div>
                <p className="text-2xs uppercase tracking-wide text-muted-foreground">Prix courant</p>
                <p className="text-sm font-bold text-primary">{formatScaleAmount(scale.scale.reference)}</p>
              </div>
              <div>
                <p className="text-2xs uppercase tracking-wide text-muted-foreground">Barème</p>
                <p className="text-sm font-bold">{formatScaleAmount(scale.scale.max)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {scale.scale.pricedInterventions}/{scale.scale.totalInterventions} tarifées
                {scale.lastChangeAt ? ` • ${formatDateTime(scale.lastChangeAt)}` : ''}
              </p>
              <Link href={scaleEditHref(scale)} aria-label={`Modifier le prix courant ${scale.name}`}>
                <Button variant="outline" size="sm" className="min-h-11">
                  <Icon name="arrow-right" size="sm" />
                  Éditer
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
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
            className="min-h-11 min-w-11"
          >
            <Icon name="chevron-left" size="sm" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={data.page >= data.pages}
            onClick={() => data.setPage(data.page + 1)}
            aria-label="Page suivante"
            className="min-h-11 min-w-11"
          >
            <Icon name="chevron-right" size="sm" />
          </Button>
        </div>
      </div>
    </div>
  );
}
