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
import type { AdminAiMatch } from '@/lib/api/admin-service';
import { formatDateTime } from '@/lib/format';
import { signalBadge } from './ai-dashboard-helpers';
import { AiPagination } from './ai-pagination';

export interface AiMatchesController {
  items: AdminAiMatch[];
  total: number;
  pages: number;
  page: number;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setPage: (page: number) => void;
}

function MatchBadge({ value }: { value: string }) {
  const meta = signalBadge('classification', value);
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

function DetailModal({ item, onClose }: { item: AdminAiMatch | null; onClose: () => void }) {
  return (
    <Modal
      open={item !== null}
      onClose={onClose}
      title="Mapping IA-5 — détail"
      description="Correspondance analytique : le diagnostic libre du technicien reste la source de vérité."
      sheet
    >
      {item ? (
        <div className="space-y-1">
          <AdminInfoRow label="Diagnostic libre" value={item.diagnostic?.content ?? item.diagnosticId} />
          <AdminInfoRow label="Catalogue proposé" value={item.catalogDiagnosticName ?? '—'} />
          <AdminInfoRow label="Résultat" value={signalBadge('classification', item.classification).label} />
          <AdminInfoRow label="Confiance" value={item.confidence !== null ? String(item.confidence) : '—'} />
          <AdminInfoRow label="Motif" value={item.reason ?? '—'} />
          <AdminInfoRow label="Modèle" value={item.model ?? '—'} />
          <AdminInfoRow label="Prompt" value={`v${item.promptVersion}`} />
          <AdminInfoRow label="Date" value={formatDateTime(item.createdAt)} />
        </div>
      ) : null}
    </Modal>
  );
}

export function AiMatchesDesktop({ controller }: { controller: AiMatchesController }) {
  const [selected, setSelected] = useState<AdminAiMatch | null>(null);
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
              icon={<Icon name="search" size="lg" />}
              title="Aucun mapping"
              description="Aucune correspondance IA-5 ne correspond aux filtres."
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Résultat</th>
                  <th className="px-4 py-3">Diagnostic libre</th>
                  <th className="px-4 py-3">Catalogue proposé</th>
                  <th className="px-4 py-3">Confiance</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Détail</th>
                </tr>
              </thead>
              <tbody>
                {controller.items.map((item) => (
                  <tr key={item.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3"><MatchBadge value={item.classification} /></td>
                    <td className="px-4 py-3 text-xs max-w-xs truncate">{item.diagnostic?.content ?? item.diagnosticId.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-xs">{item.catalogDiagnosticName ?? '—'}</td>
                    <td className="px-4 py-3 text-xs tabular-nums">{item.confidence ?? '—'}</td>
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

export function AiMatchesMobile({ controller }: { controller: AiMatchesController }) {
  const [selected, setSelected] = useState<AdminAiMatch | null>(null);
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
              icon={<Icon name="search" size="lg" />}
              title="Aucun mapping"
              description="Aucune correspondance IA-5 ne correspond aux filtres."
            />
          </CardContent>
        </Card>
      ) : (
        controller.items.map((item) => (
          <Card key={item.id}>
            <CardContent className="space-y-2 py-4">
              <div className="flex items-center justify-between gap-2">
                <MatchBadge value={item.classification} />
                <span className="text-2xs text-muted-foreground">{formatDateTime(item.createdAt)}</span>
              </div>
              <p className="text-sm font-medium line-clamp-2">{item.diagnostic?.content ?? item.diagnosticId.slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground">
                Catalogue : {item.catalogDiagnosticName ?? '—'} · confiance : {item.confidence ?? '—'}
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
