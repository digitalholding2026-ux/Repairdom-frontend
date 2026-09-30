'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Modal } from '@/components/ui/modal';
import { SkeletonRow } from '@/components/ui/skeleton';
import { AdminInfoRow } from '@/components/admin/info-row';
import type { AdminAiPricingCheck } from '@/lib/api/admin-service';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { signalBadge } from './ai-dashboard-helpers';
import { AiPagination } from './ai-pagination';

export interface AiPricingChecksController {
  items: AdminAiPricingCheck[];
  total: number;
  pages: number;
  page: number;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setPage: (page: number) => void;
}

function ResultBadge({ value }: { value: string }) {
  const meta = signalBadge('pricing', value);
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

function amountsLine(item: AdminAiPricingCheck): string {
  const parts = [`Proposé : ${formatCurrency(item.proposedPrice, 'XAF')}`];
  if (item.minAtCheck !== null) parts.push(`min : ${formatCurrency(item.minAtCheck, 'XAF')}`);
  if (item.maxAtCheck !== null) parts.push(`max : ${formatCurrency(item.maxAtCheck, 'XAF')}`);
  if (item.deviationAmount !== null) parts.push(`écart : ${formatCurrency(item.deviationAmount, 'XAF')}`);
  return parts.join(' · ');
}

function DetailModal({ item, onClose }: { item: AdminAiPricingCheck | null; onClose: () => void }) {
  return (
    <Modal
      open={item !== null}
      onClose={onClose}
      title="Contrôle tarifaire IA-6 — détail"
      description="Snapshot figé au moment du devis (jamais recalculé depuis le barème actuel)."
      sheet
    >
      {item ? (
        <div className="space-y-1">
          <AdminInfoRow label="Demande" value={item.quote?.demande?.reference ?? item.demandeId} />
          <AdminInfoRow label="Résultat" value={signalBadge('pricing', item.result).label} />
          <AdminInfoRow label="Prix proposé" value={formatCurrency(item.proposedPrice, 'XAF')} />
          <AdminInfoRow label="Min au contrôle" value={item.minAtCheck !== null ? formatCurrency(item.minAtCheck, 'XAF') : '—'} />
          <AdminInfoRow label="Référence au contrôle" value={item.referenceAtCheck !== null ? formatCurrency(item.referenceAtCheck, 'XAF') : '—'} />
          <AdminInfoRow label="Max au contrôle" value={item.maxAtCheck !== null ? formatCurrency(item.maxAtCheck, 'XAF') : '—'} />
          <AdminInfoRow label="Écart" value={item.deviationAmount !== null ? formatCurrency(item.deviationAmount, 'XAF') : '—'} />
          <AdminInfoRow label="Motif" value={item.reason ?? '—'} />
          <AdminInfoRow label="Date" value={formatDateTime(item.createdAt)} />
        </div>
      ) : null}
    </Modal>
  );
}

export function AiPricingChecksDesktop({ controller }: { controller: AiPricingChecksController }) {
  const [selected, setSelected] = useState<AdminAiPricingCheck | null>(null);
  if (controller.loading) {
    return (
      <div className="space-y-3" role="status">
        <span className="sr-only">Chargement…</span>
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {controller.error ? <Alert variant="error">{controller.error}</Alert> : null}
      {controller.items.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Icon name="briefcase" size="lg" />}
              title="Aucun contrôle"
              description="Aucun contrôle tarifaire IA-6 ne correspond aux filtres."
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Résultat</th>
                  <th className="px-4 py-3">Montants (XAF)</th>
                  <th className="px-4 py-3">Demande</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Détail</th>
                </tr>
              </thead>
              <tbody>
                {controller.items.map((item) => (
                  <tr key={item.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3"><ResultBadge value={item.result} /></td>
                    <td className="px-4 py-3 text-xs tabular-nums">{amountsLine(item)}</td>
                    <td className="px-4 py-3 text-xs">{item.quote?.demande?.reference ?? item.demandeId.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-xs">{formatDateTime(item.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="secondary" onClick={() => setSelected(item)}>
                        Ouvrir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      <AiPagination total={controller.total} pages={controller.pages} page={controller.page} setPage={controller.setPage} />
      <DetailModal item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

export function AiPricingChecksMobile({ controller }: { controller: AiPricingChecksController }) {
  const [selected, setSelected] = useState<AdminAiPricingCheck | null>(null);
  if (controller.loading) {
    return (
      <div className="space-y-3" role="status">
        <span className="sr-only">Chargement…</span>
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {controller.error ? <Alert variant="error">{controller.error}</Alert> : null}
      {controller.items.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Icon name="briefcase" size="lg" />}
              title="Aucun contrôle"
              description="Aucun contrôle tarifaire IA-6 ne correspond aux filtres."
            />
          </CardContent>
        </Card>
      ) : (
        controller.items.map((item) => (
          <Card key={item.id}>
            <CardContent className="space-y-2 py-4">
              <div className="flex items-center justify-between gap-2">
                <ResultBadge value={item.result} />
                <span className="text-2xs text-muted-foreground">{formatDateTime(item.createdAt)}</span>
              </div>
              <p className="text-sm font-medium tabular-nums">{amountsLine(item)}</p>
              <p className="text-xs text-muted-foreground">
                Demande {item.quote?.demande?.reference ?? item.demandeId.slice(0, 8)}
              </p>
              <Button size="sm" variant="secondary" className="min-h-11 w-full" onClick={() => setSelected(item)}>
                Ouvrir le détail
              </Button>
            </CardContent>
          </Card>
        ))
      )}
      <AiPagination total={controller.total} pages={controller.pages} page={controller.page} setPage={controller.setPage} />
      <DetailModal item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
