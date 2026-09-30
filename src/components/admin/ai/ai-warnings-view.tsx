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
import type { AdminAiWarning } from '@/lib/api/admin-service';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { signalBadge, surveillanceLevelText } from './ai-dashboard-helpers';
import { AiPagination } from './ai-pagination';
import { AiReviewModal } from './ai-review-modal';

export interface AiWarningsAdminController {
  items: AdminAiWarning[];
  total: number;
  pages: number;
  page: number;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setPage: (page: number) => void;
  review: (id: string, note?: string) => Promise<AdminAiWarning>;
}

function StatusBadge({ value }: { value: string }) {
  const meta = signalBadge('warning', value);
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

function pricingLine(item: AdminAiWarning): string {
  if (item.pricing && item.pricing.maxAtCheck !== null) {
    const parts = [
      `Proposé : ${formatCurrency(item.pricing.proposedPrice, 'XAF')}`,
      `max : ${formatCurrency(item.pricing.maxAtCheck, 'XAF')}`,
    ];
    if (item.pricing.deviationAmount !== null) parts.push(`écart : ${formatCurrency(item.pricing.deviationAmount, 'XAF')}`);
    return parts.join(' · ');
  }
  return `Devis ${item.quoteId.slice(0, 8)}…`;
}

function DetailModal({ item, onClose }: { item: AdminAiWarning | null; onClose: () => void }) {
  return (
    <Modal
      open={item !== null}
      onClose={onClose}
      title="Avertissement IA-7 — détail"
      description="Écart au barème avec justification technicien et revue humaine."
      sheet
    >
      {item ? (
        <div className="space-y-1">
          <AdminInfoRow label="Statut" value={signalBadge('warning', item.status).label} />
          <AdminInfoRow label="Montants" value={pricingLine(item)} />
          <AdminInfoRow label="Justification" value={item.justification ?? '—'} />
          <AdminInfoRow label="Justifiée le" value={item.justifiedAt ? formatDateTime(item.justifiedAt) : '—'} />
          <AdminInfoRow label="Tardive" value={item.isLateJustification ? 'Oui (décision admin)' : 'Non'} />
          <AdminInfoRow label="Créé le" value={formatDateTime(item.createdAt)} />
          <AdminInfoRow label="Échéance 48 h" value={formatDateTime(item.dueAt)} />
          <AdminInfoRow label="Niveau de surveillance" value={surveillanceLevelText(item.surveillanceLevel ?? 0)} />
          <AdminInfoRow label="Revue" value={item.reviewedAt ? `${formatDateTime(item.reviewedAt)} — ${item.reviewNote ?? 'sans note'}` : '—'} />
        </div>
      ) : null}
    </Modal>
  );
}

function useReview(controller: AiWarningsAdminController) {
  const [reviewId, setReviewId] = useState<string | null>(null);
  const modal = (
    <AiReviewModal
      open={reviewId !== null}
      title="Marquer comme examiné"
      description="Décision humaine conservée ; l’événement initial reste intact."
      confirmLabel="Marquer examiné"
      onClose={() => setReviewId(null)}
      onConfirm={(note) => controller.review(reviewId as string, note || undefined)}
      onDone={() => {
        setReviewId(null);
        controller.reload();
      }}
    />
  );
  return { openReview: setReviewId, modal };
}

export function AiWarningsDesktop({ controller }: { controller: AiWarningsAdminController }) {
  const [selected, setSelected] = useState<AdminAiWarning | null>(null);
  const { openReview, modal } = useReview(controller);
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
              icon={<Icon name="shield-check" size="lg" />}
              title="Aucun avertissement"
              description="Aucun écart au barème IA-7 ne correspond aux filtres."
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Montants</th>
                  <th className="px-4 py-3">Niveau</th>
                  <th className="px-4 py-3">Échéance</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {controller.items.map((item) => (
                  <tr key={item.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3"><StatusBadge value={item.status} /></td>
                    <td className="px-4 py-3 text-xs tabular-nums">{pricingLine(item)}</td>
                    <td className="px-4 py-3 text-xs tabular-nums">{item.surveillanceLevel ?? '—'}</td>
                    <td className="px-4 py-3 text-xs">{formatDateTime(item.dueAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setSelected(item)}>
                          Ouvrir
                        </Button>
                        {item.storedStatus !== 'REVIEWED' ? (
                          <Button size="sm" onClick={() => openReview(item.id)}>
                            Examiner
                          </Button>
                        ) : null}
                      </div>
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
      {modal}
    </div>
  );
}

export function AiWarningsMobile({ controller }: { controller: AiWarningsAdminController }) {
  const [selected, setSelected] = useState<AdminAiWarning | null>(null);
  const { openReview, modal } = useReview(controller);
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
              icon={<Icon name="shield-check" size="lg" />}
              title="Aucun avertissement"
              description="Aucun écart au barème IA-7 ne correspond aux filtres."
            />
          </CardContent>
        </Card>
      ) : (
        controller.items.map((item) => (
          <Card key={item.id}>
            <CardContent className="space-y-2 py-4">
              <div className="flex items-center justify-between gap-2">
                <StatusBadge value={item.status} />
                <span className="text-2xs text-muted-foreground">Niveau {item.surveillanceLevel ?? '—'}</span>
              </div>
              <p className="text-sm font-medium tabular-nums">{pricingLine(item)}</p>
              <p className="text-xs text-muted-foreground">Échéance {formatDateTime(item.dueAt)}</p>
              <div className="flex flex-col gap-2">
                <Button size="sm" variant="secondary" className="min-h-11 w-full" onClick={() => setSelected(item)}>
                  Ouvrir le détail
                </Button>
                {item.storedStatus !== 'REVIEWED' ? (
                  <Button size="sm" className="min-h-11 w-full" onClick={() => openReview(item.id)}>
                    Examiner
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))
      )}
      <AiPagination total={controller.total} pages={controller.pages} page={controller.page} setPage={controller.setPage} />
      <DetailModal item={selected} onClose={() => setSelected(null)} />
      {modal}
    </div>
  );
}
