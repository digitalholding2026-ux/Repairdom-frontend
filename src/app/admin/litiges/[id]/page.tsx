'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { Field } from '@/components/ui/field';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { formatDate, formatDateTime, fullName } from '@/lib/format';
import { toUserErrorMessage } from '@/lib/ui-error-message';
import { AdminInfoRow } from '@/components/admin/info-row';
import { KycDetailSkeleton } from '@/components/admin/kyc/kyc-detail-skeleton';
import { disputeCategoryLabel, disputeStatusConfig } from '@/lib/dispute-status';
import {
  getAdminDispute,
  reviewAdminDispute,
  type AdminDispute,
  type AdminDisputeDecision,
} from '@/lib/api/admin-service';

const TERMINAL_DECISIONS: Array<{ id: AdminDisputeDecision; label: string }> = [
  { id: 'RESOLVED', label: 'Trancher : litige fondé' },
  { id: 'REJECTED', label: 'Trancher : litige non fondé' },
];

export default function AdminLitigeDetailPage() {
  const params = useParams<{ id: string }>();
  const [dispute, setDispute] = useState<AdminDispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [resolution, setResolution] = useState('');
  const [pendingDecision, setPendingDecision] = useState<AdminDisputeDecision | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getAdminDispute(params.id)
      .then((result) => {
        if (!cancelled) setDispute(result);
      })
      .catch((err) => {
        if (!cancelled) setError(toUserErrorMessage(err, 'Erreur de chargement.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params?.id]);

  const handleReview = async () => {
    if (!params?.id || !pendingDecision || actionBusy) return;
    const trimmed = resolution.trim();
    if (pendingDecision !== 'UNDER_REVIEW' && !trimmed) {
      setActionError('Une décision motivée est requise pour trancher.');
      return;
    }
    setActionBusy(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const updated = await reviewAdminDispute(params.id, {
        decision: pendingDecision,
        resolution: pendingDecision === 'UNDER_REVIEW' ? undefined : trimmed,
      });
      setDispute(updated);
      setPendingDecision(null);
      setResolution('');
      setActionSuccess(
        pendingDecision === 'UNDER_REVIEW'
          ? 'Litige pris en charge.'
          : pendingDecision === 'RESOLVED'
            ? 'Litige tranché : fondé. Les fonds sont rendus au client, la confirmation reste bloquée.'
            : 'Litige tranché : non fondé. Le client peut à nouveau confirmer.',
      );
    } catch (err) {
      setActionError(toUserErrorMessage(err, 'Erreur lors de la décision.'));
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) return <KycDetailSkeleton />;

  if (!dispute) {
    return (
      <EmptyState
        title="Litige introuvable"
        description={error ?? 'Ce litige n’existe pas ou vous n’avez pas la permission de le consulter.'}
        action={
          <Link href="/admin/litiges">
            <Button>Retour aux litiges</Button>
          </Link>
        }
      />
    );
  }

  const config = disputeStatusConfig(dispute.status);
  const isTerminal = dispute.status === 'RESOLVED' || dispute.status === 'REJECTED';
  const resolutionRequired = pendingDecision !== null && pendingDecision !== 'UNDER_REVIEW';

  return (
    <div className="space-y-5">
      <PageHeader
        title="Examen du litige"
        backHref="/admin/litiges"
        description={`Ouvert le ${formatDate(dispute.createdAt)}`}
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={config.variant}>
              {config.label}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {disputeCategoryLabel(dispute.category)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <AdminInfoRow
              label="Mission"
              value={dispute.demande ? `${dispute.demande.reference} · ${dispute.demande.status}` : dispute.demandeId}
            />
            <AdminInfoRow
              label="Ouvert par"
              value={
                dispute.openedBy
                  ? fullName(dispute.openedBy.firstName, dispute.openedBy.lastName)
                  : '—'
              }
            />
            <AdminInfoRow
              label="Décidé par"
              value={
                dispute.decider
                  ? fullName(dispute.decider.firstName, dispute.decider.lastName)
                  : '—'
              }
            />
            <AdminInfoRow
              label="Décidé le"
              value={dispute.decidedAt ? formatDateTime(dispute.decidedAt) : '—'}
            />
          </div>
          <div>
            <span className="block text-sm font-medium">Description du client</span>
            <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
              {dispute.description}
            </p>
          </div>
          {dispute.resolution ? (
            <div>
              <span className="block text-sm font-medium">Décision motivée</span>
              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                {dispute.resolution}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {!isTerminal ? (
        <section className="space-y-3">
          <SectionHeader title="Décision" icon="alert" />
          <Card>
            <CardContent className="space-y-4">
              {actionSuccess ? <Alert variant="success">{actionSuccess}</Alert> : null}
              {actionError ? <Alert variant="error">{actionError}</Alert> : null}
              {pendingDecision ? (
                <div className="space-y-3">
                  {resolutionRequired ? (
                    <Field htmlFor="disputeResolution" label="Motivation de la décision" required>
                      <Textarea
                        id="disputeResolution"
                        value={resolution}
                        onChange={(event) => setResolution(event.target.value)}
                        placeholder="Expliquez la décision (visible par le client et le technicien)…"
                        rows={4}
                        maxLength={2000}
                      />
                    </Field>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Prendre en charge ce litige (en examen). Aucune motivation requise.
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Button onClick={handleReview} isLoading={actionBusy} disabled={resolutionRequired && !resolution.trim()}>
                      Confirmer
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setPendingDecision(null);
                        setResolution('');
                        setActionError(null);
                      }}
                      disabled={actionBusy}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {dispute.status === 'OPEN' ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setActionError(null);
                        setPendingDecision('UNDER_REVIEW');
                      }}
                      disabled={actionBusy}
                    >
                      Prendre en charge
                    </Button>
                  ) : null}
                  {TERMINAL_DECISIONS.map((decision) => (
                    <Button
                      key={decision.id}
                      variant={decision.id === 'RESOLVED' ? 'primary' : 'destructive'}
                      onClick={() => {
                        setActionError(null);
                        setPendingDecision(decision.id);
                      }}
                      disabled={actionBusy}
                    >
                      {decision.label}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      ) : (
        <Alert variant="info" dense>
          Litige tranché : aucune nouvelle décision possible.
        </Alert>
      )}
    </div>
  );
}
