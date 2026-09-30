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
import type { AdminAiConversationFlag } from '@/lib/api/admin-service';
import { formatDateTime } from '@/lib/format';
import { categoryLabel, signalBadge } from './ai-dashboard-helpers';
import { AiPagination } from './ai-pagination';
import { AiReviewModal } from './ai-review-modal';

export interface AiFlagsAdminController {
  items: AdminAiConversationFlag[];
  total: number;
  pages: number;
  page: number;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setPage: (page: number) => void;
  review: (id: string, decision: 'REVIEWED' | 'DISMISSED', note?: string) => Promise<AdminAiConversationFlag>;
}

function StatusBadge({ value }: { value: string }) {
  const meta = signalBadge('flag', value);
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

function SeverityBadge({ value }: { value: string }) {
  const meta = signalBadge('severity', value);
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

function DetailModal({ item, onClose }: { item: AdminAiConversationFlag | null; onClose: () => void }) {
  return (
    <Modal
      open={item !== null}
      onClose={onClose}
      title="Signal conversationnel IA-8 — détail"
      description="Message concerné et contexte strictement nécessaire à la revue."
      sheet
    >
      {item ? (
        <div className="space-y-1">
          <AdminInfoRow label="Catégorie" value={categoryLabel(item.category)} />
          <AdminInfoRow label="Sévérité" value={signalBadge('severity', item.severity).label} />
          <AdminInfoRow label="Confiance" value={String(item.confidence)} />
          <AdminInfoRow label="Raison IA" value={item.reason ?? '—'} />
          <AdminInfoRow label="Message concerné" value={item.message?.content ?? item.messageId} />
          <AdminInfoRow label="Auteur" value={`${item.senderRole} · ${item.sender ? `${item.sender.firstName} ${item.sender.lastName ?? ''}`.trim() : item.senderId.slice(0, 8)}`} />
          <AdminInfoRow label="Demande" value={item.demande?.reference ?? item.demandeId} />
          <AdminInfoRow label="Modèle" value={item.model ?? '—'} />
          <AdminInfoRow label="Prompt" value={`v${item.promptVersion}`} />
          <AdminInfoRow label="Date" value={formatDateTime(item.createdAt)} />
          <AdminInfoRow label="Revue" value={item.reviewedAt ? `${item.status} le ${formatDateTime(item.reviewedAt)} — ${item.reviewNote ?? 'sans note'}` : '—'} />
        </div>
      ) : null}
    </Modal>
  );
}

function useReview(controller: AiFlagsAdminController) {
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [decision, setDecision] = useState<'REVIEWED' | 'DISMISSED'>('REVIEWED');
  const open = (id: string, next: 'REVIEWED' | 'DISMISSED') => {
    setReviewId(id);
    setDecision(next);
  };
  const modal = (
    <AiReviewModal
      open={reviewId !== null}
      title={decision === 'REVIEWED' ? 'Marquer comme examiné' : 'Écarter le signal'}
      description="Décision humaine conservée ; le signal n’est jamais supprimé."
      confirmLabel={decision === 'REVIEWED' ? 'Marquer examiné' : 'Écarter'}
      onClose={() => setReviewId(null)}
      onConfirm={(note) => controller.review(reviewId as string, decision, note || undefined)}
      onDone={() => {
        setReviewId(null);
        controller.reload();
      }}
    />
  );
  return { openReview: open, modal };
}

export function AiFlagsDesktop({ controller }: { controller: AiFlagsAdminController }) {
  const [selected, setSelected] = useState<AdminAiConversationFlag | null>(null);
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
              icon={<Icon name="chat" size="lg" />}
              title="Aucun signal"
              description="Aucun signal conversationnel IA-8 ne correspond aux filtres."
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Catégorie</th>
                  <th className="px-4 py-3">Sévérité</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {controller.items.map((item) => (
                  <tr key={item.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3"><StatusBadge value={item.status} /></td>
                    <td className="px-4 py-3 text-xs">{categoryLabel(item.category)}</td>
                    <td className="px-4 py-3"><SeverityBadge value={item.severity} /></td>
                    <td className="px-4 py-3 text-xs max-w-xs truncate">{item.message?.content ?? item.messageId.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-xs">{formatDateTime(item.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setSelected(item)}>
                          Ouvrir
                        </Button>
                        {item.status === 'OPEN' ? (
                          <>
                            <Button size="sm" onClick={() => openReview(item.id, 'REVIEWED')}>
                              Examiner
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openReview(item.id, 'DISMISSED')}>
                              Écarter
                            </Button>
                          </>
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

export function AiFlagsMobile({ controller }: { controller: AiFlagsAdminController }) {
  const [selected, setSelected] = useState<AdminAiConversationFlag | null>(null);
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
              icon={<Icon name="chat" size="lg" />}
              title="Aucun signal"
              description="Aucun signal conversationnel IA-8 ne correspond aux filtres."
            />
          </CardContent>
        </Card>
      ) : (
        controller.items.map((item) => (
          <Card key={item.id}>
            <CardContent className="space-y-2 py-4">
              <div className="flex items-center justify-between gap-2">
                <StatusBadge value={item.status} />
                <SeverityBadge value={item.severity} />
              </div>
              <p className="text-sm font-medium">{categoryLabel(item.category)}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{item.message?.content ?? item.messageId.slice(0, 8)}</p>
              <p className="text-2xs text-muted-foreground">{formatDateTime(item.createdAt)} · confiance {item.confidence}</p>
              <div className="flex flex-col gap-2">
                <Button size="sm" variant="secondary" className="min-h-11 w-full" onClick={() => setSelected(item)}>
                  Ouvrir le détail
                </Button>
                {item.status === 'OPEN' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" className="min-h-11" onClick={() => openReview(item.id, 'REVIEWED')}>
                      Examiner
                    </Button>
                    <Button size="sm" variant="ghost" className="min-h-11" onClick={() => openReview(item.id, 'DISMISSED')}>
                      Écarter
                    </Button>
                  </div>
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
