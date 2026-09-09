'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { Alert } from '@/components/ui/alert';
import { Field, Input, Textarea } from '@/components/ui';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { DemandeStatusBadge, QuoteStatusBadge } from '@/components/ui/status-badge';
import { MissionInfo } from '@/components/mission/mission-info';
import { DemandeProgress } from '@/components/mission/demande-progress';
import { ConversationSection } from '@/components/mission/conversation-section';
import { RatingSection } from '@/components/mission/rating-section';
import { RatingStars } from '@/components/ui/rating-stars';
import { fullName } from '@/lib/format';
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

const POLL_INTERVAL_MS = 5000;

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
        <Alert variant="error">{error}</Alert>
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
      <PageHeader title="Détail de la demande" backHref="/technicien" />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-lg font-semibold text-primary">{demande.reference}</span>
            <DemandeStatusBadge status={demande.status} context="technician" />
          </div>
          <CardTitle className="text-base">{demande.categoryLabel}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MissionInfo
            description={demande.description}
            city={demande.city}
            requestedMode={demande.requestedMode}
            requestedAt={demande.requestedAt}
            createdAt={demande.createdAt}
            scheduledAt={demande.scheduledAt}
          />

          {demande.status !== 'CANCELED' ? (
            <div className="space-y-3">
              <SectionHeader title="Avancement" />
              <div className="rounded-xl border border-border bg-card p-4">
                <DemandeProgress status={demande.status} />
              </div>
            </div>
          ) : null}

          {demande.client ? (
            <div className="space-y-3">
              <SectionHeader title="Client" />
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <Avatar size="lg" firstName={demande.client.firstName ?? ''} lastName={demande.client.lastName} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {fullName(demande.client.firstName, demande.client.lastName)}
                  </p>
                  {demande.clientReputation && demande.clientReputation.totalReviews > 0 ? (
                    <div className="mt-1 flex items-center gap-2">
                      <RatingStars value={demande.clientReputation.averageRating ?? 0} size="sm" showValue />
                      <p className="text-xs text-muted-foreground">
                        {demande.clientReputation.totalReviews} évaluation
                        {demande.clientReputation.totalReviews > 1 ? 's' : ''}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {error ? <Alert variant="error">{error}</Alert> : null}

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
            <div className="space-y-3 rounded-xl border border-border bg-card p-3">
              <Field htmlFor="scheduledAt" label="Date et heure de l'intervention">
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={scheduledValue}
                  onChange={(event) => setScheduledValue(event.target.value)}
                />
              </Field>
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
            <Alert variant="warning" icon="clock" dense>
              En attente d&apos;acceptation du tarif par le client avant de planifier l&apos;intervention.
            </Alert>
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
            <Alert variant="warning" icon="clock" dense>
              Intervention terminée. En attente de confirmation du client.
            </Alert>
          ) : null}

          {demande.status === 'CONFIRMED' ? (
            <Alert variant="success" dense>Intervention confirmée par le client.</Alert>
          ) : null}

          {demande.status === 'CANCELED' ? (
            <Alert variant="error" dense>Cette demande a été annulée.</Alert>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon name="chat" size="sm" className="text-muted-foreground" />
            Discussion avec le client
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ConversationSection demandeId={demande.id} canSend={canDiscuss} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon name="file" size="sm" className="text-muted-foreground" />
              Diagnostic
            </CardTitle>
            <Button variant="secondary" size="sm" onClick={() => setShowDiagnosticForm((v) => !v)}>
              <Icon name="plus" size="3.5" />
              Ajouter un diagnostic
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {latestDiagnostic ? (
            <div className="space-y-2">
              <p className="whitespace-pre-line text-sm">{latestDiagnostic.content}</p>
              {latestDiagnostic.recommendation ? (
                <Alert variant="info" title="Recommandation">
                  <p className="whitespace-pre-line">{latestDiagnostic.recommendation}</p>
                </Alert>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Vous n&apos;avez pas encore publié de diagnostic.
            </p>
          )}

          {showDiagnosticForm ? (
            <div className="space-y-3 rounded-xl border border-border bg-card p-3">
              <Field htmlFor="diagnosticContent" label="Diagnostic">
                <Textarea
                  id="diagnosticContent"
                  value={diagnosticContent}
                  onChange={(event) => setDiagnosticContent(event.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="Ex. : connecteur de charge probablement endommagé."
                />
              </Field>
              <Field htmlFor="recommendation" label="Recommandation (facultatif)">
                <Input
                  id="recommendation"
                  value={recommendation}
                  onChange={(event) => setRecommendation(event.target.value)}
                  maxLength={2000}
                  placeholder="Ex. : remplacement du connecteur et test de la carte."
                />
              </Field>
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon name="badge-check" size="sm" className="text-muted-foreground" />
              Proposition tarifaire
            </CardTitle>
            <Button variant="secondary" size="sm" onClick={() => setShowQuoteForm((v) => !v)}>
              <Icon name="plus" size="3.5" />
              Proposer un tarif
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {latestQuote ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-lg font-bold">{formatAmount(latestQuote)}</span>
                <QuoteStatusBadge status={latestQuote.status} />
              </div>
              <p className="whitespace-pre-line text-sm">{latestQuote.description}</p>
              {latestQuote.status === 'PENDING' ? (
                <p className="text-sm text-muted-foreground">En attente de la réponse du client.</p>
              ) : null}
              {latestQuote.status === 'ACCEPTED' ? (
                <Alert variant="success" dense>
                  Tarif accepté. Vous pouvez maintenant planifier l&apos;intervention.
                </Alert>
              ) : null}
              {latestQuote.status === 'REJECTED' ? (
                <Alert variant="neutral" dense>
                  Tarif refusé. Vous pouvez proposer une nouvelle proposition.
                </Alert>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Vous n&apos;avez pas encore proposé de tarif.
            </p>
          )}

          {showQuoteForm ? (
            <div className="space-y-3 rounded-xl border border-border bg-card p-3">
              <Field htmlFor="quoteAmount" label="Montant (XAF)">
                <Input
                  id="quoteAmount"
                  type="number"
                  min={1}
                  value={amountValue}
                  onChange={(event) => setAmountValue(event.target.value)}
                  placeholder="Ex. : 15000"
                />
              </Field>
              <Field htmlFor="quoteDescription" label="Description">
                <Input
                  id="quoteDescription"
                  value={quoteDescription}
                  onChange={(event) => setQuoteDescription(event.target.value)}
                  maxLength={1000}
                  placeholder="Ex. : remplacement du connecteur de charge + main-d'œuvre."
                />
              </Field>
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