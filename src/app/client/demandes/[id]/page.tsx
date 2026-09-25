'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton, SkeletonCard, SkeletonRow } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SectionHeader } from '@/components/ui/page-header';
import { DemandeStatusBadge, QuoteStatusBadge } from '@/components/ui/status-badge';
import { DemandeProgress } from '@/components/mission/demande-progress';
import { MissionTimeline } from '@/components/mission/mission-timeline';
import { DispatchSonarWidget, partitionDispatchWaves } from '@/components/mission/dispatch-sonar-widget';
import { FloatingChat } from '@/components/client/chat/floating-chat';
import { MediaGallery } from '@/components/client/missions/media-gallery';
import { RatingSection } from '@/components/mission/rating-section';
import { formatDate, formatTime, fullName } from '@/lib/format';
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
import { toUserErrorMessage } from '@/lib/ui-error-message';
import { useToast } from '@/lib/toast-context';

const POLL_INTERVAL_MS = 5000;

function formatPrice(value: number | null | undefined): string {
  return value == null ? '—' : `${value.toLocaleString('fr-FR')} FCFA`;
}

export default function ClientDemandeDetailPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [demande, setDemande] = useState<DemandeListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<MissionDiagnostic[]>([]);
  const [quotes, setQuotes] = useState<MissionQuote[]>([]);
  const [events, setEvents] = useState<MissionEvent[]>([]);
  const [balance, setBalance] = useState<ClientFinanceSummary | null>(null);
  const [insufficientBalance, setInsufficientBalance] = useState<{ deficit: number } | null>(null);
  /* Action en attente de confirmation (Phase A : plus aucun acte
   * irréversible — annulation, réponse au devis, confirmation — en un clic). */
  const [confirmAction, setConfirmAction] = useState<
    | { kind: 'cancel' }
    | { kind: 'confirm' }
    | { kind: 'accept'; quoteId: string }
    | { kind: 'reject'; quoteId: string }
    | null
  >(null);
  const [chatOpen, setChatOpen] = useState(false);

  const runConfirmedAction = () => {
    if (!confirmAction || actionBusy) return;
    if (confirmAction.kind === 'cancel') void handleStatusChange('CANCELED');
    else if (confirmAction.kind === 'confirm') void handleStatusChange('CONFIRMED');
    else void handleQuoteResponse(confirmAction.quoteId, confirmAction.kind);
    setConfirmAction(null);
  };

  /* Chargement unique : premier passage complet (erreur affichée), puis
   * rafraîchissement silencieux toutes les 5 s (un seul timer). */
  useEffect(() => {
    if (!params?.id) return;
    let active = true;

    const load = async (initial: boolean) => {
      try {
        const [d, diagnosticsList, quotesList, eventsList] = await Promise.all([
          getDemande(params.id!),
          listDemandeDiagnostics(params.id!),
          listDemandeQuotes(params.id!),
          listMissionEvents(params.id!).catch(() => []),
        ]);
        if (!active) return;
        setDemande(d);
        setDiagnostics(diagnosticsList);
        setQuotes(quotesList);
        setEvents(eventsList);
        if (initial) {
          getClientFinanceSummary()
            .then((b) => { if (active) setBalance(b); })
            .catch(() => undefined);
        }
      } catch (err) {
        if (initial && active) setError(err instanceof Error ? err.message : 'Erreur de chargement.');
        // Erreur silencieuse en rafraîchissement périodique.
      } finally {
        if (initial && active) setLoading(false);
      }
    };

    load(true);
    /* UI-7 : tick ignoré onglet masqué ; reprise automatique au retour. */
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void load(false);
    }, POLL_INTERVAL_MS);
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
      toast({
        title: status === 'CONFIRMED' ? 'Intervention confirmée.' : 'Demande annulée.',
        variant: 'success',
      });
    } catch (err) {
      setError(toUserErrorMessage(err, 'Erreur lors de la mise à jour.'));
    } finally {
      setActionBusy(null);
    }
  };

  const handleQuoteResponse = async (quoteId: string, action: 'accept' | 'reject') => {
    if (!params?.id) return;
    setActionBusy(`quote:${action}`);
    setError(null);
    setInsufficientBalance(null);

    // Vérification du solde disponible avant acceptation.
    if (action === 'accept') {
      const quote = quotes.find((q) => q.id === quoteId);
      if (quote && balance) {
        const totalToDebit = quote.totalToDebit ?? (quote.amount + (quote.travel ?? 0));
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
      toast({
        title: action === 'accept' ? 'Devis accepté.' : 'Devis refusé.',
        variant: 'success',
      });
    } catch (err) {
      setError(toUserErrorMessage(err, 'Erreur lors de la réponse au devis.'));
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
      toast({ title: 'Demande de négociation envoyée.', variant: 'success' });
    } catch (err) {
      setError(toUserErrorMessage(err, 'Erreur lors de la demande de négociation.'));
    } finally {
      setActionBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 py-2" role="status">
        <span className="sr-only">Chargement…</span>
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <SkeletonCard />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
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
  const showChat = Boolean(demande.technician) && (!catalogFlow || negotiationUnlocked);
  const latestDiagnostic = diagnostics[0] ?? null;
  const latestQuote = quotes[0] ?? null;
  const deviceLabel = [
    demande.domain?.name,
    demande.brand?.name,
    demande.model?.name,
  ]
    .filter(Boolean)
    .join(' — ');
  const locationLabel = [
    demande.city,
    demande.neighborhood,
    demande.address,
    demande.landmark,
  ]
    .filter(Boolean)
    .join(' — ');
  const technicianName = demande.technician
    ? fullName(demande.technician.firstName, demande.technician.lastName)
    : null;
  /* Vagues de dispatch agrégées en hub radar (anti-bruit) : une vague isolée
   * reste dans la timeline, 2+ vagues basculent dans le widget. */
  const { waves: dispatchWaves, rest: nonDispatchEvents } = partitionDispatchWaves(events);
  const showDispatchRadar = dispatchWaves.length >= 2;
  const timelineEvents = showDispatchRadar ? nonDispatchEvents : events;

  return (
    <div className="space-y-4">
      {/* Fil d'Ariane discret */}
      <nav aria-label="Fil d'Ariane">
        <Link
          href="/client/demandes"
          aria-label="Retour à mes missions"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
        >
          <Icon name="arrow-left" size="sm" />
          Mes missions
        </Link>
      </nav>

      {/* En-tête de mission */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-3 flex-wrap">
          Mission {demande.reference}
          <DemandeStatusBadge status={demande.status} context="client" />
        </h1>
        <p className="text-sm text-muted-foreground">
          {demande.categoryLabel} • Créée le {formatDate(demande.createdAt)}
        </p>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {/* Actions principales */}
      {demande.status === 'COMPLETED' || canCancel ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          {demande.status === 'COMPLETED' ? (
            <Button
              onClick={() => setConfirmAction({ kind: 'confirm' })}
              isLoading={actionBusy === 'CONFIRMED'}
            >
              Confirmer l&apos;intervention
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              onClick={() => setConfirmAction({ kind: 'cancel' })}
              variant="destructive"
              isLoading={actionBusy === 'CANCELED'}
            >
              Annuler la demande
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Colonne principale : rapport & suivi */}
        <div className="space-y-6 lg:col-span-2">
          {/* Carte 1 : diagnostic & solution */}
          {demande.technician ? (
            <section className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <SectionHeader
                title="Diagnostic & Solution proposée"
                icon="wrench"
                action={
                  latestDiagnostic?.mode === 'MANUAL' ? (
                    <Badge variant="neutral">Diagnostic non référencé</Badge>
                  ) : undefined
                }
              />
              {latestDiagnostic ? (
                <div className="space-y-4">
                  <p className="border-l-2 border-primary pl-3 text-base font-semibold">
                    {latestDiagnostic.content}
                  </p>
                  {latestDiagnostic.proposedIntervention ? (
                    <div className="overflow-hidden rounded-xl border border-primary/20">
                      <p className="bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                        Intervention proposée
                      </p>
                      <p className="whitespace-pre-line px-3 py-2 text-sm">
                        {latestDiagnostic.proposedIntervention}
                      </p>
                    </div>
                  ) : null}
                  {[
                    { label: 'Justification', value: latestDiagnostic.justification },
                    { label: 'Note complémentaire', value: latestDiagnostic.notes },
                    { label: 'Recommandation', value: latestDiagnostic.recommendation },
                  ]
                    .filter((item) => item.value)
                    .map((item) => (
                      <blockquote
                        key={item.label}
                        className="space-y-1 rounded-xl border-l-2 border-border bg-muted/40 py-2 pl-3 pr-2"
                      >
                        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <Icon name="info" size="3.5" />
                          {item.label}
                        </p>
                        <p className="whitespace-pre-line text-sm">{item.value}</p>
                      </blockquote>
                    ))}
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
            </section>
          ) : null}

          {/* Proposition d'intervention (devis) */}
          {demande.technician ? (
            <section className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <SectionHeader title="Proposition d'intervention" icon="badge-check" />
              {latestQuote ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="figure text-lg font-bold">{formatQuoteAmount(latestQuote)}</span>
                    <QuoteStatusBadge status={latestQuote.status} />
                  </div>
                  <p className="whitespace-pre-line text-sm">{latestQuote.description}</p>

                  {latestQuote.repair != null || latestQuote.travel != null ? (
                    <dl className="space-y-1 rounded-xl border border-border bg-muted/20 p-3 text-sm tabular-nums">
                      {latestQuote.catalogDiagnostic?.name ? (
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-muted-foreground">Diagnostic</dt>
                          <dd className="text-right font-medium">{latestQuote.catalogDiagnostic.name}</dd>
                        </div>
                      ) : null}
                      {latestQuote.catalogIntervention?.name ? (
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-muted-foreground">Intervention</dt>
                          <dd className="text-right font-medium">{latestQuote.catalogIntervention.name}</dd>
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Réparation</dt>
                        <dd className="font-medium">{formatPrice(latestQuote.repair ?? latestQuote.breakdown?.referencePrice ?? null)}</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Déplacement</dt>
                        <dd className="font-medium">{formatPrice(latestQuote.travel ?? latestQuote.breakdown?.travelFee ?? null)}</dd>
                      </div>
                      <div className="my-1 h-px bg-border" aria-hidden />
                      <div className="flex items-center justify-between">
                        <dt className="font-semibold">Total à payer</dt>
                        <dd className="font-semibold tabular-nums">
                          {formatPrice(latestQuote.totalToDebit ?? (latestQuote.amount + (latestQuote.travel ?? 0)))}
                        </dd>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">Montant débité de votre solde après acceptation.</p>
                    </dl>
                  ) : null}

                  {insufficientBalance ? (
                    <div className="space-y-2 rounded-xl border border-error/30 bg-error/5 p-4">
                      <p className="text-sm font-semibold text-error">Votre solde est insuffisant.</p>
                      <p className="text-sm">
                        Il vous manque {formatCurrency(insufficientBalance.deficit, balance?.currency ?? 'FCFA')} pour valider cette intervention.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        La recharge en ligne n’est pas encore disponible. Suivez votre solde depuis la page dédiée.
                      </p>
                      <Link href="/client/solde">
                        <Button variant="secondary" className="w-full">Voir mon solde</Button>
                      </Link>
                      {canCancel ? (
                        <Button
                          variant="ghost"
                          className="w-full"
                          onClick={() => setConfirmAction({ kind: 'cancel' })}
                        >
                          Annuler la demande
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  {latestQuote.status === 'PENDING' && !insufficientBalance ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setConfirmAction({ kind: 'accept', quoteId: latestQuote.id })}
                          isLoading={actionBusy === 'quote:accept'}
                          className="flex-1"
                        >
                          Accepter le devis
                        </Button>
                        <Button
                          onClick={() => setConfirmAction({ kind: 'reject', quoteId: latestQuote.id })}
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
                      Devis accepté. Le technicien peut maintenant planifier l&apos;intervention.
                    </Alert>
                  ) : null}

                  {latestQuote.status === 'REJECTED' ? (
                    <Alert variant="neutral" dense>
                      Devis refusé. Le technicien peut proposer un nouveau devis.
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
                  Le technicien n&apos;a pas encore proposé de devis.
                </p>
              )}
            </section>
          ) : null}

          {/* Carte 2 : galerie médias & pièces jointes */}
          <section className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <MediaGallery medias={demande.medias} />
          </section>

          {/* Carte 3 : chronologie */}
          <section className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <SectionHeader title="Chronologie de la mission" icon="clock" />
            {showDispatchRadar ? (
              <DispatchSonarWidget waves={dispatchWaves} active={!demande.technician && canCancel} />
            ) : null}
            {timelineEvents.length > 0 ? (
              <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                <MissionTimeline events={timelineEvents} />
              </div>
            ) : showDispatchRadar ? null : (
              <DemandeProgress status={demande.status} />
            )}
          </section>

          {demande.technician && demande.status === 'CONFIRMED' ? (
            <RatingSection
              demandeId={demande.id}
              title="Votre avis sur le technicien"
              alreadyRatedLabel="Vous avez déjà évalué cette intervention."
            />
          ) : null}
        </div>

        {/* Colonne secondaire : fiche synthèse */}
        <div className="space-y-6 lg:col-span-1">
          {/* Carte 4 : synthèse de la demande */}
          <section className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <SectionHeader title="Synthèse de la demande" icon="file" />
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Appareil</dt>
                <dd className="mt-0.5 font-medium">{deviceLabel || demande.categoryLabel}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Problème déclaré</dt>
                <dd className="mt-0.5 text-foreground">“{demande.description}”</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Lieu d&apos;intervention</dt>
                <dd className="mt-0.5">{locationLabel || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contact</dt>
                <dd className="mt-0.5 font-medium tabular-nums">{demande.contactPhone || '—'}</dd>
              </div>
            </dl>
          </section>

          {/* Carte 5 : technicien assigné */}
          <section className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <SectionHeader title="Technicien assigné" icon="user" />
            {demande.technician ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    firstName={demande.technician.firstName}
                    lastName={demande.technician.lastName}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{technicianName}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Icon name="pin" size="3.5" />
                      {demande.technician.city || 'Ville non renseignée'}
                    </p>
                  </div>
                </div>
                <Link href={`/client/technicien/${demande.technician.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    <Icon name="user" size="sm" />
                    Voir le profil
                  </Button>
                </Link>
                {showChat ? (
                  <Button size="sm" className="w-full" onClick={() => setChatOpen(true)}>
                    <Icon name="chat" size="sm" />
                    Discuter
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun technicien assigné pour le moment. Nous recherchons un professionnel disponible.
              </p>
            )}
          </section>
        </div>
      </div>

      {showChat ? (
        <FloatingChat
          demandeId={demande.id}
          peerName={technicianName}
          peerFirstName={demande.technician?.firstName}
          peerLastName={demande.technician?.lastName}
          canSend={canDiscuss}
          open={chatOpen}
          onOpenChange={setChatOpen}
        />
      ) : null}

      <ConfirmDialog
        open={confirmAction !== null}
        onCancel={() => setConfirmAction(null)}
        onConfirm={runConfirmedAction}
        loading={actionBusy !== null}
        tone={confirmAction?.kind === 'cancel' || confirmAction?.kind === 'reject' ? 'danger' : 'primary'}
        title={
          confirmAction?.kind === 'cancel'
            ? 'Annuler la demande ?'
            : confirmAction?.kind === 'accept'
              ? 'Accepter ce devis ?'
              : confirmAction?.kind === 'reject'
                ? 'Refuser ce devis ?'
                : 'Confirmer l’intervention ?'
        }
        description={
          confirmAction?.kind === 'cancel'
            ? 'La demande sera annulée. Le technicien en sera informé.'
            : confirmAction?.kind === 'accept'
              ? 'Le montant sera débité de votre solde et le technicien pourra planifier l’intervention.'
              : confirmAction?.kind === 'reject'
                ? 'Le technicien pourra vous proposer un nouveau devis.'
                : 'Vous validez que l’intervention est terminée. Cette action déclenche le règlement.'
        }
        confirmLabel={
          confirmAction?.kind === 'cancel'
            ? 'Annuler la demande'
            : confirmAction?.kind === 'accept'
              ? 'Accepter'
              : confirmAction?.kind === 'reject'
                ? 'Refuser'
                : 'Confirmer'
        }
      />
    </div>
  );
}
