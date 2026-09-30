'use client';

import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Modal } from '@/components/ui/modal';
import { SkeletonRow } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { AiWarning } from '@/lib/api/ai-warnings-service';
import type { AiWarningsController } from './use-ai-warnings';

const STATUS_META: Record<string, { label: string; variant: 'warning' | 'info' | 'success' | 'neutral' }> = {
  PENDING: { label: 'En attente', variant: 'warning' },
  JUSTIFIED: { label: 'Justifié', variant: 'success' },
  EXPIRED: { label: 'Délai dépassé', variant: 'info' },
  REVIEWED: { label: 'Examiné', variant: 'neutral' },
};

function statusBadge(status: string) {
  const meta = STATUS_META[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

function amountsLine(warning: AiWarning): string {
  const pricing = warning.pricing;
  if (pricing && pricing.maxAtCheck !== null) {
    const parts = [`Proposé : ${formatCurrency(pricing.proposedPrice, 'XAF')}`, `barème max : ${formatCurrency(pricing.maxAtCheck, 'XAF')}`];
    if (pricing.deviationAmount !== null) parts.push(`écart : ${formatCurrency(pricing.deviationAmount, 'XAF')}`);
    return parts.join(' · ');
  }
  if (warning.quote) return `Proposé : ${formatCurrency(warning.quote.amount, warning.quote.currency)}`;
  return 'Montants disponibles dans le détail de la mission.';
}

function JustifyModal({ controller }: { controller: AiWarningsController }) {
  const active = controller.warnings.find((w) => w.id === controller.justifyId) ?? null;
  return (
    <Modal
      open={active !== null}
      onClose={() => controller.closeJustify()}
      title="Justifier l'écart au barème"
      description={
        active
          ? `Devis ${active.quoteId.slice(0, 8)}… · ${amountsLine(active)}. Expliquez la différence en texte libre (difficulté, pièces, déplacement, complexité, temps).`
          : undefined
      }
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => controller.closeJustify()} disabled={controller.justifyBusy}>
            Annuler
          </Button>
          <Button onClick={() => void controller.submitJustify()} isLoading={controller.justifyBusy}>
            Envoyer la justification
          </Button>
        </div>
      }
    >
      <div className="space-y-2">
        <Textarea
          value={controller.justifyText}
          onChange={(e) => controller.setJustifyText(e.target.value)}
          rows={5}
          maxLength={2000}
          placeholder="Ex. accès difficile, pièce supplémentaire à remplacer, déplacement exceptionnel…"
        />
        <p className="text-xs text-muted-foreground">
          {controller.justifyText.trim().length} / 2000 caractères (minimum 10). Horodatée côté serveur.
          {active && new Date(active.dueAt).getTime() <= Date.now()
            ? ' Délai dépassé : votre justification sera marquée comme tardive et conservée pour examen.'
            : ''}
        </p>
        {controller.justifyError ? <Alert variant="error">{controller.justifyError}</Alert> : null}
      </div>
    </Modal>
  );
}

function WarningCardBody({ warning }: { warning: AiWarning }) {
  return (
    <div className="space-y-1.5 text-sm">
      <p className="font-medium">{amountsLine(warning)}</p>
      <p className="text-xs text-muted-foreground">
        Demande {warning.demande?.reference ?? warning.demandeId.slice(0, 8)} · devis {warning.quoteId.slice(0, 8)}…
        · échéance {formatDateTime(warning.dueAt)}
      </p>
      {warning.justification ? (
        <p className="rounded-lg bg-muted p-2 text-xs">« {warning.justification} »{warning.isLateJustification ? ' (tardive)' : ''}</p>
      ) : null}
    </div>
  );
}

/* ── Mobile : cards verticales, action tactile prioritaire ── */
export function WarningsMobileView({ controller }: { controller: AiWarningsController }) {
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
      {controller.warnings.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Icon name="shield-check" size="lg" />}
              title="Aucun avertissement"
              description="Vos prix respectent les barèmes applicables. Aucune justification n'est attendue."
            />
          </CardContent>
        </Card>
      ) : (
        controller.warnings.map((warning) => (
          <Card key={warning.id}>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                {statusBadge(warning.status)}
                <span className="text-2xs text-muted-foreground">{formatDateTime(warning.createdAt)}</span>
              </div>
              <WarningCardBody warning={warning} />
              <div className="flex flex-col gap-2">
                {warning.storedStatus !== 'REVIEWED' && warning.storedStatus !== 'JUSTIFIED' ? (
                  <Button size="sm" className="w-full" onClick={() => controller.openJustify(warning)}>
                    Justifier (48 h)
                  </Button>
                ) : null}
                {warning.demandeId ? (
                  <Link href={`/technicien/demandes/${warning.demandeId}`} className="block">
                    <Button variant="secondary" size="sm" className="w-full">
                      Voir la mission
                    </Button>
                  </Link>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))
      )}
      <JustifyModal controller={controller} />
    </div>
  );
}

/* ── Desktop : vrai tableau, informations secondaires visibles ── */
export function WarningsDesktopView({ controller }: { controller: AiWarningsController }) {
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
    <div className="space-y-4">
      {controller.error ? <Alert variant="error">{controller.error}</Alert> : null}
      {controller.warnings.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Icon name="shield-check" size="lg" />}
              title="Aucun avertissement"
              description="Vos prix respectent les barèmes applicables. Aucune justification n'est attendue."
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Montants</th>
                  <th className="px-4 py-3">Mission</th>
                  <th className="px-4 py-3">Échéance 48 h</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {controller.warnings.map((warning) => (
                  <tr key={warning.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3">{statusBadge(warning.status)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{amountsLine(warning)}</p>
                      {warning.justification ? (
                        <p className="mt-1 max-w-md truncate text-xs text-muted-foreground">
                          « {warning.justification} »{warning.isLateJustification ? ' (tardive)' : ''}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {warning.demande?.reference ?? warning.demandeId.slice(0, 8)} · devis {warning.quoteId.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 text-xs">{formatDateTime(warning.dueAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {warning.storedStatus !== 'REVIEWED' && warning.storedStatus !== 'JUSTIFIED' ? (
                          <Button size="sm" onClick={() => controller.openJustify(warning)}>
                            Justifier
                          </Button>
                        ) : null}
                        {warning.demandeId ? (
                          <Link href={`/technicien/demandes/${warning.demandeId}`}>
                            <Button variant="secondary" size="sm">
                              Mission
                            </Button>
                          </Link>
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
      <JustifyModal controller={controller} />
    </div>
  );
}
