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
import {
  getDemande,
  updateDemandeStatus,
  listDemandeDiagnostics,
  listDemandeQuotes,
  respondToQuote,
  formatQuoteAmount,
  type DemandeListItem,
  type MissionDiagnostic,
  type MissionQuote,
} from '@/lib/api/request-service';

const POLL_INTERVAL_MS = 5000;

export default function ClientDemandeDetailPage() {
  const params = useParams<{ id: string }>();
  const [demande, setDemande] = useState<DemandeListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<MissionDiagnostic[]>([]);
  const [quotes, setQuotes] = useState<MissionQuote[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!params?.id) return;
      try {
        const d = await getDemande(params.id);
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
    try {
      const updated = await respondToQuote(params.id, quoteId, action);
      setQuotes((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la réponse au tarif.');
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
  const canDiscuss = demande.status !== 'CANCELED' && demande.status !== 'CONFIRMED';
  const latestDiagnostic = diagnostics[0] ?? null;
  const latestQuote = quotes[0] ?? null;

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

      {demande.technician ? (
        <MissionSummaryCard demandeId={demande.id} />
      ) : null}

      {demande.technician ? (
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
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon name="file" size="sm" className="text-muted-foreground" />
              Diagnostic proposé par le technicien
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latestDiagnostic ? (
              <div className="space-y-3">
                <p className="whitespace-pre-line text-sm">{latestDiagnostic.content}</p>
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

                {latestQuote.status === 'PENDING' ? (
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