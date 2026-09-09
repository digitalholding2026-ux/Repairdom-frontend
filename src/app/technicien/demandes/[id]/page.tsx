'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ConversationSection } from '@/components/mission/conversation-section';
import { RatingSection } from '@/components/mission/rating-section';
import { formatRequestedTiming } from '@/lib/request-timing';
import { formatReputation } from '@/lib/api/review-service';
import {
  getTechnicianDemande,
  acceptDemande,
  updateTechnicianDemandeStatus,
  listDemandeDiagnostics,
  createDemandeDiagnostic,
  listDemandeQuotes,
  createDemandeQuote,
  type TechnicianDemande,
  type MissionDiagnostic,
  type MissionQuote,
} from '@/lib/api/technician-service';

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Nouvelle',
  PENDING: 'En attente',
  ACCEPTED: 'Acceptée',
  SCHEDULED: 'Rendez-vous fixé',
  IN_PROGRESS: 'Intervention en cours',
  COMPLETED: 'Terminée',
  CONFIRMED: 'Confirmée',
  CANCELED: 'Annulée',
};

const STATUS_VARIANTS: Record<string, 'info' | 'warning' | 'success' | 'danger' | 'neutral'> = {
  SUBMITTED: 'info',
  PENDING: 'warning',
  ACCEPTED: 'success',
  SCHEDULED: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'warning',
  CONFIRMED: 'success',
  CANCELED: 'danger',
};

const QUOTE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente du client',
  ACCEPTED: 'Accepté',
  REJECTED: 'Refusé',
};

const QUOTE_STATUS_VARIANTS: Record<string, 'info' | 'warning' | 'success' | 'danger' | 'neutral'> = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  REJECTED: 'neutral',
};

const POLL_INTERVAL_MS = 5000;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAmount(quote: Pick<MissionQuote, 'amount' | 'currency'>): string {
  return `${quote.amount.toLocaleString('fr-FR')} ${quote.currency}`;
}

export default function TechnicianDemandeDetailPage() {
  const params = useParams<{ id: string }>();
  const [demande, setDemande] = useState<TechnicianDemande | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [scheduledValue, setScheduledValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<MissionDiagnostic[]>([]);
  const [quotes, setQuotes] = useState<MissionQuote[]>([]);
  const [showDiagnosticForm, setShowDiagnosticForm] = useState(false);
  const [diagnosticContent, setDiagnosticContent] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [amountValue, setAmountValue] = useState('');
  const [quoteDescription, setQuoteDescription] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!params?.id) return;
      try {
        const d = await getTechnicianDemande(params.id);
        if (!cancelled) setDemande(d);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur de chargement.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [params?.id]);

  useEffect(() => {
    if (!params?.id) return;
    let active = true;

    const load = async () => {
      try {
        const [diagnosticsList, quotesList] = await Promise.all([
          listDemandeDiagnostics(params.id!),
          listDemandeQuotes(params.id!),
        ]);
        if (active) {
          setDiagnostics(diagnosticsList);
          setQuotes(quotesList);
        }
      } catch {
        // Erreur silencieuse en rafraîchissement périodique.
      }
    };

    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [params?.id]);

  const handleAccept = async () => {
    if (!params?.id) return;
    setActionBusy('ACCEPTED');
    setError(null);
    try {
      const updated = await acceptDemande(params.id);
      setDemande(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'acceptation.');
    } finally {
      setActionBusy(null);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!params?.id) return;
    setActionBusy(status);
    setError(null);
    try {
      const updated = await updateTechnicianDemandeStatus(params.id, status);
      setDemande(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour.');
    } finally {
      setActionBusy(null);
    }
  };

  const handleSchedule = async () => {
    if (!params?.id) return;
    setActionBusy('SCHEDULED');
    setError(null);
    try {
      const updated = await updateTechnicianDemandeStatus(
        params.id,
        'SCHEDULED',
        new Date(scheduledValue).toISOString(),
      );
      setDemande(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la planification.');
    } finally {
      setActionBusy(null);
    }
  };

  const handleCreateDiagnostic = async () => {
    if (!params?.id) return;
    const content = diagnosticContent.trim();
    if (!content) return;
    setActionBusy('DIAGNOSTIC');
    setError(null);
    try {
      const created = await createDemandeDiagnostic(params.id, {
        content,
        recommendation: recommendation.trim(),
      });
      setDiagnostics((prev) => [created, ...prev]);
      setDiagnosticContent('');
      setRecommendation('');
      setShowDiagnosticForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout du diagnostic.');
    } finally {
      setActionBusy(null);
    }
  };

  const handleCreateQuote = async () => {
    if (!params?.id) return;
    const amount = Number(amountValue);
    if (!Number.isInteger(amount) || amount <= 0) {
      setError('Veuillez saisir un montant valide (entier, supérieur à 0).');
      return;
    }
    const description = quoteDescription.trim();
    if (!description) {
      setError('Veuillez décrire la proposition.');
      return;
    }
    setActionBusy('QUOTE');
    setError(null);
    try {
      const created = await createDemandeQuote(params.id, { amount, description });
      setQuotes((prev) => [created, ...prev]);
      setAmountValue('');
      setQuoteDescription('');
      setShowQuoteForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du tarif.');
    } finally {
      setActionBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !demande) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
        <Link href="/technicien">
          <Button variant="secondary">Retour aux demandes</Button>
        </Link>
      </div>
    );
  }

  if (!demande) return null;

  const canAccept = demande.status === 'SUBMITTED' || demande.status === 'PENDING';
  const canDiscuss = demande.status !== 'CANCELED' && demande.status !== 'CONFIRMED';
  const hasAcceptedQuote = quotes.some((q) => q.status === 'ACCEPTED');
  const latestDiagnostic = diagnostics[0] ?? null;
  const latestQuote = quotes[0] ?? null;

  return (
    <div className="space-y-4">
      <Link href="/technicien" className="text-sm font-medium text-primary hover:underline">
        ← Retour aux demandes
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <span className="font-mono text-lg font-semibold text-primary">{demande.reference}</span>
            <Badge variant={STATUS_VARIANTS[demande.status] ?? 'neutral'}>
              {STATUS_LABELS[demande.status] ?? demande.status}
            </Badge>
          </div>
          <CardTitle className="text-base">{demande.categoryLabel}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</h2>
            <p className="whitespace-pre-line text-sm">{demande.description}</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Localisation</h2>
            <p className="text-sm font-medium">{demande.city}</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {demande.requestedMode === 'SCHEDULED' ? 'Intervention souhaitée par le client' : 'Intervention'}
            </h2>
            <p className="text-sm font-medium">
              {demande.requestedMode === 'SCHEDULED' ? (
                <>📅 {formatRequestedTiming(demande.requestedMode, demande.requestedAt)}</>
              ) : (
                <>🚨 Intervention dès que possible</>
              )}
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date de la demande</h2>
            <p className="text-sm">{formatDate(demande.createdAt)}</p>
          </div>

          {demande.scheduledAt ? (
            <div className="space-y-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rendez-vous prévu</h2>
              <p className="text-sm font-medium">{formatDateTime(demande.scheduledAt)}</p>
            </div>
          ) : null}

          {demande.client ? (
            <div className="space-y-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Client</h2>
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="text-sm font-medium">
                  {[demande.client.firstName, demande.client.lastName].filter(Boolean).join(' ')}
                </p>
                {demande.clientReputation ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatReputation(demande.clientReputation)}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          ) : null}

          {canAccept ? (
            <Button
              onClick={handleAccept}
              isLoading={actionBusy === 'ACCEPTED'}
              className="w-full"
              size="lg"
            >
              Accepter la demande
            </Button>
          ) : null}

          {demande.status === 'ACCEPTED' && hasAcceptedQuote ? (
            <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-3">
              <div className="space-y-1">
                <label
                  htmlFor="scheduledAt"
                  className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Date et heure de l&apos;intervention
                </label>
                <input
                  id="scheduledAt"
                  type="datetime-local"
                  value={scheduledValue}
                  onChange={(event) => setScheduledValue(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <Button
                onClick={handleSchedule}
                isLoading={actionBusy === 'SCHEDULED'}
                disabled={!scheduledValue}
                className="w-full"
                size="lg"
              >
                Planifier l&apos;intervention
              </Button>
            </div>
          ) : null}

          {demande.status === 'ACCEPTED' && !hasAcceptedQuote ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/30 dark:text-amber-300">
              En attente d&apos;acceptation du tarif par le client avant de planifier l&apos;intervention.
            </div>
          ) : null}

          {demande.status === 'SCHEDULED' ? (
            <Button
              onClick={() => handleStatusChange('IN_PROGRESS')}
              isLoading={actionBusy === 'IN_PROGRESS'}
              className="w-full"
              size="lg"
            >
              Démarrer l&apos;intervention
            </Button>
          ) : null}

          {demande.status === 'IN_PROGRESS' ? (
            <Button
              onClick={() => handleStatusChange('COMPLETED')}
              isLoading={actionBusy === 'COMPLETED'}
              className="w-full"
              size="lg"
            >
              Marquer comme terminée
            </Button>
          ) : null}

          {demande.status === 'COMPLETED' ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/30 dark:text-amber-300">
              Intervention terminée. En attente de confirmation du client.
            </div>
          ) : null}

          {demande.status === 'CONFIRMED' ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/30 dark:text-emerald-300">
              Intervention confirmée par le client.
            </div>
          ) : null}

          {demande.status === 'CANCELED' ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-300">
              Cette demande a été annulée.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Discussion avec le client</CardTitle>
        </CardHeader>
        <CardContent>
          <ConversationSection demandeId={demande.id} canSend={canDiscuss} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Diagnostic</CardTitle>
            <Button variant="secondary" size="sm" onClick={() => setShowDiagnosticForm((v) => !v)}>
              Ajouter un diagnostic
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {latestDiagnostic ? (
            <div className="space-y-2">
              <p className="whitespace-pre-line text-sm">{latestDiagnostic.content}</p>
              {latestDiagnostic.recommendation ? (
                <div className="rounded-lg border border-border bg-muted/50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recommandation</p>
                  <p className="mt-1 whitespace-pre-line text-sm">{latestDiagnostic.recommendation}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Vous n&apos;avez pas encore publié de diagnostic.
            </p>
          )}

          {showDiagnosticForm ? (
            <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-3">
              <div className="space-y-1">
                <label htmlFor="diagnosticContent" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Diagnostic
                </label>
                <textarea
                  id="diagnosticContent"
                  value={diagnosticContent}
                  onChange={(event) => setDiagnosticContent(event.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="Ex. : connecteur de charge probablement endommagé."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="recommendation" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Recommandation (facultatif)
                </label>
                <input
                  id="recommendation"
                  value={recommendation}
                  onChange={(event) => setRecommendation(event.target.value)}
                  maxLength={2000}
                  placeholder="Ex. : remplacement du connecteur et test de la carte."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <Button
                onClick={handleCreateDiagnostic}
                isLoading={actionBusy === 'DIAGNOSTIC'}
                disabled={!diagnosticContent.trim()}
                className="w-full"
              >
                Publier le diagnostic
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Proposition tarifaire</CardTitle>
            <Button variant="secondary" size="sm" onClick={() => setShowQuoteForm((v) => !v)}>
              Proposer un tarif
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {latestQuote ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-lg font-semibold">{formatAmount(latestQuote)}</span>
                <Badge variant={QUOTE_STATUS_VARIANTS[latestQuote.status] ?? 'neutral'}>
                  {QUOTE_STATUS_LABELS[latestQuote.status] ?? latestQuote.status}
                </Badge>
              </div>
              <p className="whitespace-pre-line text-sm">{latestQuote.description}</p>
              {latestQuote.status === 'PENDING' ? (
                <p className="text-sm text-muted-foreground">
                  En attente de la réponse du client.
                </p>
              ) : null}
              {latestQuote.status === 'ACCEPTED' ? (
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  Tarif accepté. Vous pouvez maintenant planifier l&apos;intervention.
                </p>
              ) : null}
              {latestQuote.status === 'REJECTED' ? (
                <p className="text-sm text-muted-foreground">
                  Tarif refusé. Vous pouvez proposer une nouvelle proposition.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Vous n&apos;avez pas encore proposé de tarif.
            </p>
          )}

          {showQuoteForm ? (
            <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-3">
              <div className="space-y-1">
                <label htmlFor="quoteAmount" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Montant (XAF)
                </label>
                <input
                  id="quoteAmount"
                  type="number"
                  min={1}
                  value={amountValue}
                  onChange={(event) => setAmountValue(event.target.value)}
                  placeholder="Ex. : 15000"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="quoteDescription" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Description
                </label>
                <input
                  id="quoteDescription"
                  value={quoteDescription}
                  onChange={(event) => setQuoteDescription(event.target.value)}
                  maxLength={1000}
                  placeholder="Ex. : remplacement du connecteur de charge + main-d'œuvre."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <Button
                onClick={handleCreateQuote}
                isLoading={actionBusy === 'QUOTE'}
                disabled={!amountValue.trim() || !quoteDescription.trim()}
                className="w-full"
              >
                Proposer
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {demande.status === 'CONFIRMED' ? (
        <RatingSection
          demandeId={demande.id}
          title="Votre avis sur le client"
          alreadyRatedLabel="Vous avez déjà évalué ce client pour cette intervention."
        />
      ) : null}
    </div>
  );
}