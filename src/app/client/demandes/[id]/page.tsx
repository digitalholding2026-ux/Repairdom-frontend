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
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { DemandeStatusBadge, QuoteStatusBadge } from '@/components/ui/status-badge';
import { MissionInfo } from '@/components/mission/mission-info';
import { DemandeProgress } from '@/components/mission/demande-progress';
import { MissionSummaryCard } from '@/components/mission/mission-summary';
import { ConversationSection } from '@/components/mission/conversation-section';
import { RatingSection } from '@/components/mission/rating-section';
import { formatTime, fullName } from '@/lib/format';
import { demandeStatusConfig } from '@/lib/request-status';
import { listMissionEvents, type MissionEvent } from '@/lib/api/mission-events-service';
import {
  getDemande,
  updateDemandeStatus,
  listDemandeDiagnostics,
  listDemandeQuotes,
  respondToQuote,
  requestQuoteNegotiation,
  formatQuoteAmount,
  type DemandeListItem,
  type MissionDiagnostic,
  type MissionQuote,
} from '@/lib/api/request-service';
import { getClientFinanceSummary, type ClientFinanceSummary } from '@/lib/api/finance-service';
import { formatCurrency } from '@/lib/format';

const POLL_INTERVAL_MS = 5000;

function formatPrice(value: number | null | undefined): string {
  return value == null ? '—' : `${value.toLocaleString('fr-FR')} XAF`;
}

export default function ClientDemandeDetailPage() {
  const params = useParams<{ id: string }>();
  const [demande, setDemande] = useState<DemandeListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<MissionDiagnostic[]>([]);
  const [quotes, setQuotes] = useState<MissionQuote[]>([]);
  const [events, setEvents] = useState<MissionEvent[]>([]);
  const [balance, setBalance] = useState<ClientFinanceSummary | null>(null);
  const [insufficientBalance, setInsufficientBalance] = useState<{ deficit: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!params?.id) return;
      try {
        const [d, ev] = await Promise.all([
          getDemande(params.id),
          listMissionEvents(params.id).catch(() => []),
        ]);
        if (!cancelled) {
          setDemande(d);
          setEvents(ev);
        }
        getClientFinanceSummary().then((b) => { if (!cancelled) setBalance(b); }).catch(() => undefined);
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
        const [d, diagnosticsList, quotesList, eventsList] = await Promise.all([
          getDemande(params.id!),
          listDemandeDiagnostics(params.id!),
          listDemandeQuotes(params.id!),
          listMissionEvents(params.id!).catch(() => []),
        ]);
        if (active) {
          setDemande(d);
          setDiagnostics(diagnosticsList);
          setQuotes(quotesList);
          setEvents(eventsList);
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

  const handleStatusChange = async (status: 'CONFIRMED' | 'CANCELED') => {
    if (!params?.id) return;
    setActionBusy(status);
    setError(null);
    try {
      const updated = await updateDemandeStatus(params.id, status);
      setDemande(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour.');
    } finally {
      setActionBusy(null);
    }
  };

  const handleQuoteResponse = async (quoteId: string, action: 'accept' | 'reject') => {
    if (!params?.id) return;
    setActionBusy(`quote:${action}`);
    setError(null);
    setInsufficientBalance(null);

    // Vérification du solde avant acceptation (mode simulation).
    if (action === 'accept') {
      const quote = quotes.find((q) => q.id === quoteId);
      if (quote && balance) {
        const totalToDebit = quote.totalToDebit ?? (quote.amount + (quote.clientFee ?? 0));
        if (balance.balance < totalToDebit) {
          setInsufficientBalance({ deficit: totalToDebit - balance.balance });
          setActionBusy(null);
          return;
        }
      }
    }

    try {
      const updated = await respondToQuote(params.id, quoteId, action);
      setQuotes((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la réponse au tarif.');
    } finally {
      setActionBusy(null);
    }
  };

  const handleNegotiate = async (quoteId: string) => {
    if (!params?.id) return;
    setActionBusy('negotiate');
    setError(null);
    try {
      const result = await requestQuoteNegotiation(params.id, quoteId);
      setDemande((prev) =>
        prev ? { ...prev, negotiationRequestedAt: result.negotiationRequestedAt } : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la demande de négociation.');
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
        <Link href="/client/demandes">
          <Button variant="secondary">Retour à mes demandes</Button>
        </Link>
      </div>
    );
  }

  if (!demande) return null;

  const canCancel = ['SUBMITTED', 'PENDING', 'ACCEPTED', 'SCHEDULED'].includes(demande.status);
  const baseCanDiscuss = demande.status !== 'CANCELED' && demande.status !== 'CONFIRMED';
  const catalogFlow = quotes.some((q) => q.source === 'CATALOG');
  const negotiationUnlocked =
    Boolean(demande.negotiationRequestedAt) || quotes.some((q) => q.status === 'ACCEPTED');
  const canDiscuss = baseCanDiscuss && (!catalogFlow || negotiationUnlocked);
  const latestDiagnostic = diagnostics[0] ?? null;
  const latestQuote = quotes[0] ?? null;
  const lastActivityLabel =
    events.length > 0
      ? events[events.length - 1].label
      : demandeStatusConfig(demande.status, 'client').label;
  const deviceLabel = [
    demande.domain?.name,
    demande.brand?.name,
    demande.model?.name,
    demande.problem?.name,
  ]
    .filter(Boolean)
    .join(' — ');

  return (
    <div className="space-y-4">
      <PageHeader title="Détail de la demande" backHref="/client/demandes" />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-lg font-semibold text-primary">{demande.reference}</span>
            <DemandeStatusBadge status={demande.status} context="client" />
          </div>
          <CardTitle className="text-base">{demande.categoryLabel}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {deviceLabel ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <Icon name="briefcase" size="sm" className="shrink-0 text-primary" />
              <p className="text-sm text-foreground">{deviceLabel}</p>
            </div>
          ) : null}

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

          <div className="space-y-3">
            <SectionHeader title={demande.technician ? 'Technicien assigné' : 'Technicien'} />
            {demande.technician ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar
                    size="lg"
                    firstName={demande.technician.firstName ?? ''}
                    lastName={demande.technician.lastName}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{fullName(demande.technician.firstName, demande.technician.lastName)}</p>
                    {demande.technician.city ? (
                      <p className="text-xs text-muted-foreground">{demande.technician.city}</p>
                    ) : null}
                  </div>
                </div>
                <Link href={`/client/technicien/${demande.technician.id}`} className="shrink-0">
                  <Button variant="outline" size="sm">
                    Voir le profil
                  </Button>
                </Link>
              </div>
            ) : (
              <Alert variant="neutral" icon="search">
                Recherche d&apos;un technicien adapté à votre panne…
              </Alert>
            )}
          </div>

          {error ? <Alert variant="error">{error}</Alert> : null}

          {demande.status === 'COMPLETED' ? (
            <Button
              onClick={() => handleStatusChange('CONFIRMED')}
              isLoading={actionBusy === 'CONFIRMED'}
              className="w-full"
              size="lg"
            >
              Confirmer l&apos;intervention
            </Button>
          ) : null}

          {canCancel ? (
            <Button
              onClick={() => handleStatusChange('CANCELED')}
              variant="destructive"
              isLoading={actionBusy === 'CANCELED'}
              className="w-full"
              size="lg"
            >
              Annuler la demande
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {events.length > 0 ? (
        <Link
          href={`/client/chronologies/${demande.id}`}
          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/40"
        >
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Dernière activité</p>
            <p className="truncate text-sm font-medium">{lastActivityLabel}</p>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
            Voir la chronologie
            <Icon name="chevron-right" size="sm" />
          </span>
        </Link>
      ) : null}

      {demande.technician ? (
        <MissionSummaryCard demandeId={demande.id} />
      ) : null}

      {demande.technician && (!catalogFlow || negotiationUnlocked) ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon name="chat" size="sm" className="text-muted-foreground" />
              Discussion avec votre technicien
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ConversationSection demandeId={demande.id} canSend={canDiscuss} />
          </CardContent>
        </Card>
      ) : null}

      {demande.technician ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="file" size="sm" className="text-muted-foreground" />
                Diagnostic proposé par le technicien
              </CardTitle>
              {latestDiagnostic?.mode === 'MANUAL' ? (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  Diagnostic non référencé
                </span>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {latestDiagnostic ? (
              <div className="space-y-3">
                <p className="whitespace-pre-line text-sm">{latestDiagnostic.content}</p>
                {latestDiagnostic.proposedIntervention ? (
                  <Alert variant="info" title="Intervention proposée">
                    <p className="whitespace-pre-line">{latestDiagnostic.proposedIntervention}</p>
                  </Alert>
                ) : null}
                {latestDiagnostic.justification ? (
                  <Alert variant="info" title="Justification">
                    <p className="whitespace-pre-line">{latestDiagnostic.justification}</p>
                  </Alert>
                ) : null}
                {latestDiagnostic.notes ? (
                  <Alert variant="neutral" title="Note complémentaire">
                    <p className="whitespace-pre-line">{latestDiagnostic.notes}</p>
                  </Alert>
                ) : null}
                {latestDiagnostic.recommendation ? (
                  <Alert variant="info" title="Recommandation">
                    <p className="whitespace-pre-line">{latestDiagnostic.recommendation}</p>
                  </Alert>
                ) : null}
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Icon name="user" size="3.5" />
                  {fullName(latestDiagnostic.technician.firstName, latestDiagnostic.technician.lastName)}
                  <span aria-hidden>·</span>
                  {formatTime(latestDiagnostic.createdAt)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Le technicien n&apos;a pas encore publié de diagnostic.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {demande.technician ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon name="badge-check" size="sm" className="text-muted-foreground" />
              Proposition d&apos;intervention
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latestQuote ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-lg font-bold">{formatQuoteAmount(latestQuote)}</span>
                  <QuoteStatusBadge status={latestQuote.status} />
                </div>
                <p className="whitespace-pre-line text-sm">{latestQuote.description}</p>

                {latestQuote.repair != null || latestQuote.travel != null || latestQuote.clientFee != null ? (
                  <div className="space-y-1 rounded-lg border border-border bg-muted/20 p-3 text-sm">
                    {latestQuote.catalogDiagnostic?.name ? (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Diagnostic</span>
                        <span className="text-right font-medium">{latestQuote.catalogDiagnostic.name}</span>
                      </div>
                    ) : null}
                    {latestQuote.catalogIntervention?.name ? (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Intervention</span>
                        <span className="text-right font-medium">{latestQuote.catalogIntervention.name}</span>
                      </div>
                    ) : null}
                    {(latestQuote.catalogDiagnostic?.name || latestQuote.catalogIntervention?.name) ? (
                      <div className="my-1 h-px bg-border" />
                    ) : null}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Réparation</span>
                      <span className="font-medium">{formatPrice(latestQuote.repair ?? latestQuote.breakdown?.referencePrice ?? null)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Déplacement</span>
                      <span className="font-medium">{formatPrice(latestQuote.travel ?? latestQuote.breakdown?.travelFee ?? null)}</span>
                    </div>
                    {latestQuote.clientFee != null ? (
                      <>
                        <div className="my-1 h-px bg-border" />
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Frais RepairDom (client)</span>
                          <span className="font-medium">{formatPrice(latestQuote.clientFee)}</span>
                        </div>
                      </>
                    ) : null}
                    <div className="my-1 h-px bg-border" />
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Total débité</span>
                      <span className="font-semibold">
                        {formatPrice(latestQuote.totalToDebit ?? (latestQuote.amount + (latestQuote.clientFee ?? 0)))}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Montant débité de votre solde après acceptation.</p>
                  </div>
                ) : null}

                {insufficientBalance ? (
                  <div className="space-y-2 rounded-lg border border-error/30 bg-error/5 p-4">
                    <p className="text-sm font-semibold text-error">Votre solde est insuffisant.</p>
                    <p className="text-sm text-foreground">
                      Il vous manque {formatCurrency(insufficientBalance.deficit, balance?.currency ?? 'XAF')} pour valider cette intervention.
                    </p>
                    <Link href="/client/solde">
                      <Button className="w-full">Recharger mon solde</Button>
                    </Link>
                  </div>
                ) : null}

                {latestQuote.status === 'PENDING' && !insufficientBalance ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleQuoteResponse(latestQuote.id, 'accept')}
                        isLoading={actionBusy === 'quote:accept'}
                        className="flex-1"
                      >
                        Accepter le tarif
                      </Button>
                      <Button
                        onClick={() => handleQuoteResponse(latestQuote.id, 'reject')}
                        variant="destructive"
                        isLoading={actionBusy === 'quote:reject'}
                        className="flex-1"
                      >
                        Refuser
                      </Button>
                    </div>
                    {latestQuote.source === 'CATALOG' && !demande.negotiationRequestedAt ? (
                      <Button
                        onClick={() => handleNegotiate(latestQuote.id)}
                        variant="secondary"
                        isLoading={actionBusy === 'negotiate'}
                        className="w-full"
                      >
                        <Icon name="chat" size="sm" />
                        Négocier avec le technicien
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                {latestQuote.status === 'ACCEPTED' ? (
                  <Alert variant="success" dense>
                    Tarif accepté. Le technicien peut maintenant planifier l&apos;intervention.
                  </Alert>
                ) : null}

                {latestQuote.status === 'REJECTED' ? (
                  <Alert variant="neutral" dense>
                    Tarif refusé. Le technicien peut proposer une nouvelle proposition.
                  </Alert>
                ) : null}

                {demande.negotiationRequestedAt ? (
                  <Alert variant="info" dense>
                    Négociation ouverte : discutez maintenant avec le technicien.
                  </Alert>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Le technicien n&apos;a pas encore proposé de tarif.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {demande.technician && demande.status === 'CONFIRMED' ? (
        <RatingSection
          demandeId={demande.id}
          title="Votre avis sur le technicien"
          alreadyRatedLabel="Vous avez déjà évalué cette intervention."
        />
      ) : null}
    </div>
  );
}