'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton, SkeletonCard, SkeletonRow } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SectionHeader } from '@/components/ui/page-header';
import { DemandeStatusBadge, QuoteStatusBadge } from '@/components/ui/status-badge';
import { DemandeProgress } from '@/components/mission/demande-progress';
import { MissionTimeline } from '@/components/mission/mission-timeline';
import { ConversationSection } from '@/components/mission/conversation-section';
import { DispatchSonarWidget, partitionDispatchWaves } from '@/components/mission/dispatch-sonar-widget';
import { TravelBanner } from '@/components/mission/travel-banner';
import { MissionMap } from '@/components/mission/mission-map';
import { RechercheTechnicienAnimation } from '@/components/lottie/lottie-animations';
import { formatTravelDistance, formatTravelRecency } from '@/lib/travel-location';
import { DemandeMediaSection } from '@/components/mission/demande-media-section';
import { DiagnosticAudioPlayer } from '@/components/mission/diagnostic-audio-player';
import { getDemandeMediaFileUrl } from '@/lib/api/request-service';
import { RatingSection } from '@/components/mission/rating-section';
import { formatDate, formatDateTime, formatTime, fullName } from '@/lib/format';
import { listMissionEvents, type MissionEvent } from '@/lib/api/mission-events-service';
import {
  getDemande,
  updateDemandeStatus,
  getDiagnosticAudioUrl,
  listDemandeDiagnostics,
  listDemandeQuotes,
  respondToQuote,
  requestQuoteNegotiation,
  formatQuoteAmount,
  getDispute,
  openDispute,
  type DemandeListItem,
  type DemandeDispute,
  type DisputeCategory,
  type MissionDiagnostic,
  type MissionQuote,
} from '@/lib/api/request-service';
import { getClientFinanceSummary, type ClientFinanceSummary } from '@/lib/api/finance-service';
import { formatCurrency } from '@/lib/format';
import { formatFCFA } from '@/lib/format-fcfa';
import { useRealtime } from '@/lib/realtime/sse-context';
import { missionStreamUrl } from '@/lib/realtime/use-mission-stream';
import { toUserErrorMessage } from '@/lib/ui-error-message';
import { useToast } from '@/lib/toast-context';
import {
  DISPUTE_CATEGORIES,
  DISPUTE_DESCRIPTION_MAX,
  DISPUTE_DESCRIPTION_MIN,
  DISPUTE_STATUS_CONFIG,
  disputeCategoryLabel,
  disputeStatusConfig,
} from '@/lib/dispute-status';

/* CHANTIER 6A — hiérarchie de l'écran mission client.
 *
 * La page est réorganisée en sections verticales priorisées par statut : ce
 * qu'un client doit décider ou suivre en premier remonte en haut, le reste
 * descend. Aucun bloc n'est rendu « par défaut » : chaque section a une
 * condition stricte (voir `show*` ci-dessous), ce qui évite qu'une mission
 * annulée affiche encore ses médias, sa carte GPS et sa chronologie.
 *
 * Ce que le chantier NE touche PAS :
 *   - les appels API et leur séquence (4 au montage + `getDispute`
 *     conditionnel + `getClientFinanceSummary` au premier passage) ;
 *   - le SSE (`subscribe(missionStreamUrl(...))`) et son filtrage ;
 *   - le polling 5 s et ses deux gardes (onglet caché / SSE actif) ;
 *   - la logique des actions (devis, annulation, confirmation, litige) — les
 *     gestionnaires et les `ConfirmDialog` sont inchangés, seule leur
 *     position dans l'arbre change.
 *
 * ⚠️ RÈGLE DES HOOKS : les 3 returns anticipés (`loading`, `error`,
 * `!demande`) restent SOUS le dernier hook. Le test
 * `technician-quote.test.ts` l.233 verrouille cette contrainte sur la page
 * technicien ; elle s'applique ici à l'identique. Aucun `useX` ne doit être
 * ajouté après ces returns.
 */

const POLL_INTERVAL_MS = 5000;

/** Statuts où un suivi live (technicien, GPS, discussion) a du sens. */
const LIVE_STATUSES = ['ACCEPTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'];

function formatPrice(value: number | null | undefined): string {
  return formatFCFA(value);
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
  /* CHANTIER 6C-1 — la chronologie distingue « vide » de « chargement échoué ».
   * Un tableau vide est un état normal (mission jeune) ; une liste vide à
   * cause d'une erreur réseau ne doit pas laisser croire qu'il ne s'est rien
   * passé. */
  const [eventsLoadState, setEventsLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [balance, setBalance] = useState<ClientFinanceSummary | null>(null);
  /* CHANTIER 6C-1 — le solde est-il connu ET exploitable ?
   *
   * AVANT : l'échec réseau de la lecture du solde était avalé, `balance`
   * restait `null`, et la garde de pré-validation (ligne ~209) était
   * court-circuitée par `balance &&`. Le client cliquait donc « Accepter le
   * devis » sans contrôle préalable et recevait un refus `INSUFFICIENT_FUNDS`
   * — un code qu'il ne peut pas interpréter.
   *
   * MAINTENANT : `error` est affiché, et l'acceptation est bloquée tant que le
   * solde n'est pas connu. Refuser une action est préférable à laisser
   * déclencher une erreur incompréhensible. */
  const [balanceLoadState, setBalanceLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  /* Incrémenté par « Réessayer » pour relancer la lecture du solde. */
  const [balanceReloadKey, setBalanceReloadKey] = useState(0);
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
  /* Litige post-intervention : visible sur mission COMPLETED uniquement.
   * null = aucun litige (contestation possible), objet = litige affiché. */
  const [dispute, setDispute] = useState<DemandeDispute | null>(null);
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState<DisputeCategory>('QUALITY');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeError, setDisputeError] = useState<string | null>(null);
  const [disputeBusy, setDisputeBusy] = useState(false);
  /* Temps réel : chaque événement mission pertinent (statut, devis, GPS)
   * redéclenche le chargement silencieux ; le chat gère ses messages
   * lui-même (ajout direct, sans refetch). */
  const [sseTick, setSseTick] = useState(0);
  const { status: realtimeStatus, subscribe } = useRealtime();
  const realtimeStatusRef = useRef(realtimeStatus);
  realtimeStatusRef.current = realtimeStatus;

  useEffect(() => {
    if (!params?.id) return;
    return subscribe(missionStreamUrl(params.id), (message) => {
      if (message.type === 'mission.message_created') return;
      setSseTick((tick) => tick + 1);
    });
  }, [params?.id, subscribe]);

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
        const [d, diagnosticsList, quotesList, eventsResult] = await Promise.all([
          getDemande(params.id!),
          listDemandeDiagnostics(params.id!),
          listDemandeQuotes(params.id!),
          // 6C-1 : la chronologie note son propre échec au lieu de le
          // confondre avec une mission sans historique.
          listMissionEvents(params.id!).then(
            (list): [MissionEvent[], 'loading' | 'loaded' | 'error'] => [list, 'loaded'],
            (): [MissionEvent[], 'loading' | 'loaded' | 'error'] => [[], 'error'],
          ),
        ]);
        if (!active) return;
        setDemande(d);
        setDiagnostics(diagnosticsList);
        setQuotes(quotesList);
        setEvents(eventsResult[0]);
        setEventsLoadState(eventsResult[1]);
        /* Litige : mission terminée uniquement, silencieux (jamais bloquant). */
        if (d.status === 'COMPLETED') {
          getDispute(params.id!)
            .then((result) => { if (active) setDispute(result); })
            .catch(() => undefined);
        } else if (active) {
          setDispute(null);
        }
      } catch (err) {
        if (initial && active) setError(toUserErrorMessage(err, 'Erreur de chargement.'));
        // Erreur silencieuse en rafraîchissement périodique.
      } finally {
        if (initial && active) setLoading(false);
      }
    };

    load(true);
    /* UI-7 : tick ignoré onglet masqué ; reprise automatique au retour.
     * En mode SSE, le rechargement est piloté par les événements (sseTick)
     * et le polling périodique reste en fallback uniquement. */
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (realtimeStatusRef.current === 'sse') return;
      void load(false);
    }, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [params?.id, sseTick]);

  /* CHANTIER 6C-1 — le solde est lu DANS SON PROPRE effet, séparé de la
   * mission. Deux raisons :
   *   - il ne sert qu'à l'acceptation d'un devis, pas à l'affichage de la
   *     mission : un échec réseau ne doit pas relancer la mission entière ;
   *   - il doit pouvoir être relancé seul par « Réessayer », sans faire
   *     recharger les 4 autres ressources.
   * Le premier passage le lisait au sein du chargement initial, ce qui
   * rendait tout échec indistinguable d'un « solde encore inconnu ». */
  useEffect(() => {
    if (!params?.id) return;
    let active = true;
    setBalanceLoadState('loading');

    getClientFinanceSummary()
      .then((b) => {
        if (!active) return;
        setBalance(b);
        setBalanceLoadState('loaded');
      })
      .catch(() => {
        if (active) setBalanceLoadState('error');
      });
    return () => {
      active = false;
    };
  }, [params?.id, balanceReloadKey]);

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

    // Vérification du solde disponible avant acceptation (6C-1 : le solde
    // DOIT être connu, sinon on refuse l'acceptation au lieu de laisser le
    // backend trancher par un refus que le client ne peut pas lire).
    if (action === 'accept') {
      const quote = quotes.find((q) => q.id === quoteId);
      if (quote && balanceLoadState === 'loaded' && balance) {
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

  /* Litige post-intervention : description 10..2000 (miroir backend). */
  const disputeDescriptionLength = disputeDescription.trim().length;
  const disputeValid =
    disputeDescriptionLength >= DISPUTE_DESCRIPTION_MIN &&
    disputeDescriptionLength <= DISPUTE_DESCRIPTION_MAX;

  const handleOpenDispute = async () => {
    if (!params?.id || disputeBusy) return;
    if (!disputeValid) {
      setDisputeError(
        `Décrivez le problème en ${DISPUTE_DESCRIPTION_MIN} à ${DISPUTE_DESCRIPTION_MAX} caractères.`,
      );
      return;
    }
    setDisputeBusy(true);
    setDisputeError(null);
    try {
      const created = await openDispute(params.id, {
        category: disputeCategory,
        description: disputeDescription.trim(),
      });
      setDispute(created);
      setDisputeDialogOpen(false);
      setDisputeDescription('');
      setDisputeError(null);
      toast({ title: 'Litige ouvert. Notre équipe va l’examiner.', variant: 'success' });
    } catch (err) {
      setDisputeError(toUserErrorMessage(err, 'Erreur lors de l’ouverture du litige.'));
    } finally {
      setDisputeBusy(false);
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

  /* ── Conditions strictes de section (chantier 6A) ────────────────────
   * Chaque section a désormais une condition d'affichage explicite : plus
   * aucun bloc n'est rendu par défaut, ce qui vide la page d'une mission
   * annulée ou sans technicien. */
  const showLiveTracking =
    demande.technicianId != null && LIVE_STATUSES.includes(demande.status);
  const showMedias = demande.medias.length > 0;
  const showDiagnostic = latestDiagnostic !== null;
  const showQuote = quotes.length > 0;
  const showTimeline = events.length > 0;
  /* 6C-1 : la chronologie est soit affichée, soit explicitement en erreur —
     jamais silencieusement vide à cause d'un échec réseau. */
  const timelineFailed = eventsLoadState === 'error';
  const showRating = demande.status === 'CONFIRMED' && Boolean(demande.technician);
  const showDisputeSection = demande.status === 'COMPLETED' || dispute !== null;
  /* Un devis en attente de réponse est la seule chose qui demande vraiment
   * une décision : il passe donc au-dessus de tous les bandeaux d'état. */
  const hasPendingQuote = latestQuote?.status === 'PENDING';

  return (
    <div className="space-y-6">
      {/* ═══ 1. HEADER ═══════════════════════════════════════════════════ */}
      <header className="space-y-3">
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
        <div className="space-y-1">
          <h1 className="flex flex-wrap items-center gap-3 text-2xl font-bold tracking-tight">
            Mission {demande.reference}
            <DemandeStatusBadge status={demande.status} context="client" />
          </h1>
          <p className="text-sm text-muted-foreground">
            {demande.categoryLabel} • Créée le {formatDate(demande.createdAt)}
          </p>
        </div>
      </header>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {/* ═══ 2. ACTION PRIORITAIRE ═══════════════════════════════════════
       * Ordre de priorité : devis à accepter > bandeau d'état. Un devis en
       * attente est la seule situation qui exige une décision immédiate ;
       * le bandeau d'état n'est affiché que lorsqu'aucun devis n'attend. */}
      {hasPendingQuote && latestQuote ? (
        <section
          aria-label="Devis à accepter"
          className="space-y-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 shadow-sm sm:p-5"
        >
          <SectionHeader
            title="Proposition d'intervention"
            icon="badge-check"
            description="Acceptez le devis pour que le technicien puisse planifier son intervention."
            action={<QuoteStatusBadge status={latestQuote.status} />}
          />
          <div className="flex items-center justify-between gap-3">
            <span className="figure text-lg font-bold">{formatQuoteAmount(latestQuote)}</span>
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
              <p className="mt-1 text-xs text-muted-foreground">
                Montant débité de votre solde après acceptation.
              </p>
            </dl>
          ) : null}

          {insufficientBalance ? (
            <div className="space-y-2 rounded-xl border border-error/30 bg-error/5 p-4">
              <p className="text-sm font-semibold text-error">Votre solde est insuffisant.</p>
              <p className="text-sm">
                Il vous manque {formatCurrency(insufficientBalance.deficit, balance?.currency ?? 'FCFA')} pour valider cette intervention.
              </p>
              <p className="text-sm text-muted-foreground">
                Rechargez votre solde en ligne par Mobile Money pour valider cette intervention.
              </p>
              <Link href="/client/solde/recharger">
                <Button className="w-full">Recharger mon solde</Button>
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
          ) : (
            <div className="space-y-2">
              {/* 6C-1 — le solde n'a pas pu être lu. On ne peut ni confirmer
                  qu'il suffit, ni affirmer qu'il manque : l'acceptation est
                  suspendue jusqu'à la relance. « Refuser » reste possible —
                  c'est une décision du client, pas une vérification système. */}
              {balanceLoadState !== 'loaded' ? (
                <div className="space-y-2 rounded-xl border border-warning/30 bg-warning/5 p-4">
                  <p className="text-sm font-semibold">
                    {balanceLoadState === 'error'
                      ? 'Impossible de vérifier votre solde.'
                      : 'Vérification de votre solde en cours…'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    L&apos;acceptation du devis est suspendue tant que votre solde n&apos;est pas
                    confirmé. Aucun montant ne sera débité d&apos;ici là.
                  </p>
                  {balanceLoadState === 'error' ? (
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => setBalanceReloadKey((key) => key + 1)}
                    >
                      Réessayer
                    </Button>
                  ) : null}
                </div>
              ) : null}
              <div className="flex gap-2">
                <Button
                  onClick={() => setConfirmAction({ kind: 'accept', quoteId: latestQuote.id })}
                  isLoading={actionBusy === 'quote:accept'}
                  disabled={balanceLoadState !== 'loaded'}
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
          )}
        </section>
      ) : (
        <section aria-label="État de la mission" className="space-y-3">
          {demande.status === 'SUBMITTED' || demande.status === 'PENDING' ? (
            /* Recherche en cours : le statut est déjà porté par le badge du
             * header, ce bloc sert à expliquer CE QUI SE PASSE. */
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
              <RechercheTechnicienAnimation className="h-16 w-16 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">Recherche d&apos;un technicien en cours</p>
                <p className="text-xs text-muted-foreground">
                  Nous recherchons un professionnel disponible dans votre zone. Vous serez
                  prévenu dès qu&apos;un technicien accepte.
                </p>
              </div>
            </div>
          ) : null}

          {demande.status === 'ACCEPTED' || demande.status === 'SCHEDULED' ? (
            <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
              {demande.technician ? (
                <>
                  <Avatar
                    firstName={demande.technician.firstName}
                    lastName={demande.technician.lastName}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Technicien assigné</p>
                    <p className="text-xs text-muted-foreground">
                      {technicianName}
                      {demande.scheduledAt
                        ? ` · rendez-vous le ${formatDateTime(demande.scheduledAt)}`
                        : ' · en attente de planification'}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm font-semibold">Technicien assigné</p>
              )}
            </div>
          ) : null}

          {demande.status === 'IN_PROGRESS' ? (
            <Alert variant="info" icon="wrench" title="Intervention en cours">
              Le technicien travaille sur votre appareil. Vous serez prévenu dès que
              l&apos;intervention sera terminée.
            </Alert>
          ) : null}

          {demande.status === 'COMPLETED' ? (
            <div className="space-y-3 rounded-2xl border border-success/30 bg-success/5 p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success/15 text-success-ink">
                  <Icon name="check-circle" size="md" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Intervention terminée</p>
                  <p className="text-xs text-muted-foreground">
                    Vérifiez le travail réalisé avant de confirmer.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setConfirmAction({ kind: 'confirm' })}
                isLoading={actionBusy === 'CONFIRMED'}
                size="lg"
                className="w-full"
              >
                Confirmer l&apos;intervention
              </Button>
              <p className="text-xs text-muted-foreground">
                Vos fonds restent bloqués jusqu&apos;à votre confirmation : ils ne seront
                versés au technicien qu&apos;ensuite.
              </p>
            </div>
          ) : null}

          {demande.status === 'CONFIRMED' ? (
            <Alert variant="success" icon="check-circle" title="Mission confirmée">
              Intervention validée, le règlement a été effectué. Vous pouvez laisser un avis
              au technicien ci-dessous.
            </Alert>
          ) : null}

          {demande.status === 'CANCELED' ? (
            <Alert variant="neutral" icon="info" title="Mission annulée">
              Cette mission a été annulée. Aucun montant n&apos;a été débité de votre solde.
            </Alert>
          ) : null}
        </section>
      )}

      {/* ═══ 3. SUIVI LIVE ══════════════════════════════════════════════
       * Uniquement s&apos;il y a un technicien ET une mission active : ni GPS
       * ni bandeau de déplacement ne doivent subsister sur une mission
       * annulée ou sans intervention en cours. */}
      {showLiveTracking ? (
        <section aria-label="Suivi de l'intervention" className="space-y-4">
          {/* GPS V3 — déplacement temporaire (statut + fraîcheur + distance,
              jamais de coordonnées brutes). */}
          <TravelBanner travel={demande.travel} />

          {/* GPS V4 — carte de mission (données V1/V3 existantes uniquement). */}
          {demande.travel?.enRoute || demande.travel?.arrived ? (
            <TravelMapSection
              latitude={demande.latitude}
              longitude={demande.longitude}
              travel={demande.travel}
              travelMap={demande.travelMap}
            />
          ) : null}

          {/* Fiche technicien : elle fait partie du suivi live, pas de la
              synthèse — c&apos;est de l&apos;information d&apos;exécution. */}
          <Card>
            <CardContent className="space-y-3 pt-4 sm:pt-5">
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
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {/* ═══ 4. DÉTAIL MISSION ═══════════════════════════════════════════ */}
      <section aria-label="Détail de la mission" className="space-y-4">
        <Card>
          <CardContent className="space-y-4 pt-4 sm:pt-5">
            <SectionHeader title="Synthèse de la demande" icon="file" />
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Appareil
                </dt>
                <dd className="mt-0.5 font-medium">{deviceLabel || demande.categoryLabel}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Problème déclaré
                </dt>
                <dd className="mt-0.5 text-foreground">
                  {demande.description ? (
                    <>“{demande.description}”</>
                  ) : (
                    <span className="text-muted-foreground">
                      Sans texte — voir vos photos, vidéos et messages vocaux ci-dessous.
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Lieu d&apos;intervention
                </dt>
                <dd className="mt-0.5">{locationLabel || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Contact
                </dt>
                <dd className="mt-0.5 font-medium tabular-nums">{demande.contactPhone || '—'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Médias : bloc sans condition d'affichage avant le chantier 6A,
            il s'affichait même sans pièce jointe. */}
        {showMedias ? (
          <Card>
            <CardContent className="pt-4 sm:pt-5">
              <DemandeMediaSection
                demandeId={demande.id}
                medias={demande.medias}
                fetchUrl={(demandeId, mediaId) => getDemandeMediaFileUrl(demandeId, mediaId)}
              />
            </CardContent>
          </Card>
        ) : null}
      </section>

      {/* ═══ 5. DIAGNOSTIC + DEVIS ══════════════════════════════════════
       * Regroupés : ce sont les deux productions du technicien. Le devis
       * n&apos;est re-rendu ici que s&apos;il n&apos;est PAS déjà remonté
       * dans l&apos;action prioritaire (éviter le même montant 2 fois). */}
      <section aria-label="Diagnostic et proposition" className="space-y-4">
        {showDiagnostic ? (
          <Card>
            <CardContent className="space-y-4 pt-4 sm:pt-5">
              <SectionHeader
                title="Diagnostic du technicien"
                icon="wrench"
                action={
                  latestDiagnostic?.mode === 'MANUAL' ? (
                    <Badge variant="neutral">Diagnostic non référencé</Badge>
                  ) : undefined
                }
              />
              <div className="space-y-4">
                <p className="border-l-2 border-primary pl-3 text-base font-semibold">
                  {latestDiagnostic?.content}
                </p>
                {latestDiagnostic?.hasAudio ? (
                  <DiagnosticAudioPlayer
                    demandeId={demande.id}
                    diagnosticId={latestDiagnostic.id}
                    diagnosticLabel={latestDiagnostic.content.slice(0, 60)}
                    fetchUrl={(demandeId, diagnosticId) =>
                      getDiagnosticAudioUrl(demandeId, diagnosticId)
                    }
                  />
                ) : null}
                {latestDiagnostic?.proposedIntervention ? (
                  <div className="overflow-hidden rounded-xl border border-primary/20">
                    <p className="bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                      Intervention proposée
                    </p>
                    <p className="whitespace-pre-line px-3 py-2 text-sm">
                      {latestDiagnostic.proposedIntervention}
                    </p>
                  </div>
                ) : null}
                {latestDiagnostic
                  ? [
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
                      ))
                  : null}
                {latestDiagnostic ? (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Icon name="user" size="3.5" />
                    {fullName(latestDiagnostic.technician.firstName, latestDiagnostic.technician.lastName)}
                    <span aria-hidden>·</span>
                    {formatTime(latestDiagnostic.createdAt)}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : demande.technician ? (
          <Card>
            <CardContent className="pt-4 sm:pt-5">
              <SectionHeader title="Diagnostic du technicien" icon="wrench" />
              <EmptyState
                icon={<Icon name="wrench" size="md" />}
                title="Diagnostic en attente"
                description="Le technicien n'a pas encore transmis de diagnostic sur votre mission."
              />
            </CardContent>
          </Card>
        ) : null}

        {/* Le devis PENDING vit dans l'action prioritaire : on ne le rend ici
            que s'il a déjà été traité (ACCEPTED / REJECTED) pour que le client
            garde la trace de ce qu'il a validé ou refusé. */}
        {showQuote && latestQuote && !hasPendingQuote ? (
          <Card>
            <CardContent className="space-y-3 pt-4 sm:pt-5">
              <SectionHeader
                title="Proposition d'intervention"
                icon="badge-check"
                action={<QuoteStatusBadge status={latestQuote.status} />}
              />
              <div className="flex items-center justify-between gap-3">
                <span className="figure text-lg font-bold">{formatQuoteAmount(latestQuote)}</span>
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
                  <p className="mt-1 text-xs text-muted-foreground">
                    Montant débité de votre solde après acceptation.
                  </p>
                </dl>
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
                  Négociation ouverte : discutez avec le technicien ci-dessous.
                </Alert>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </section>

{/* ═══ 6. DISCUSSION ══════════════════════════════════════════════
       * Inline : le chat était jusqu'ici dans une bulle flottante qui
         masquait la position du message dans la page et imposait un clic
         pour y accéder. Le composant (ConversationSection) est le même
         que celui du côté technicien — aucun double rendu du fil. */}
      {showChat && demande.technician ? (
        <section aria-label="Discussion" className="space-y-3">
          <Card>
            <CardContent className="space-y-3 pt-4 sm:pt-5">
              <SectionHeader
                title="Discussion avec le technicien"
                icon="chat"
                description={technicianName ? `Échangez avec ${technicianName}.` : undefined}
              />
              <ConversationSection
                demandeId={demande.id}
                canSend={canDiscuss}
                peerName={technicianName}
              />
            </CardContent>
          </Card>
        </section>
      ) : null}

      {/* ═══ 7. CHRONOLOGIE ═════════════════════════════════════════════ */}
      {showTimeline || timelineFailed ? (
        <section aria-label="Chronologie" className="space-y-3">
          <Card>
            <CardContent className="space-y-4 pt-4 sm:pt-5">
              <SectionHeader title="Chronologie de la mission" icon="clock" />
              {/* 6C-1 : un historique injoignable ne doit pas ressembler à une
                  mission sans événement. État d'erreur explicite + relance. */}
              {timelineFailed ? (
                <EmptyState
                  icon={<Icon name="clock" size="md" />}
                  title="Impossible de charger l’historique"
                  description="La chronologie de la mission n’a pas pu être récupérée. Le reste de la page reste à jour."
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSseTick((tick) => tick + 1)}
                    >
                      Réessayer
                    </Button>
                  }
                  className="py-6"
                />
              ) : (
                <>
                  {showDispatchRadar ? (
                    <DispatchSonarWidget waves={dispatchWaves} active={!demande.technician && canCancel} />
                  ) : null}
                  {timelineEvents.length > 0 ? (
                    <div className="relative space-y-4 before:absolute before:bottom-2 before:left-3 before:top-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                      <MissionTimeline events={timelineEvents} />
                    </div>
                  ) : showDispatchRadar ? null : (
                    <DemandeProgress status={demande.status} />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {/* ═══ 8. AVIS ═════════════════════════════════════════════════════ */}
      {showRating ? (
        <section aria-label="Avis" className="space-y-3">
          <RatingSection
            demandeId={demande.id}
            title="Votre avis sur le technicien"
            alreadyRatedLabel="Vous avez déjà évalué cette intervention."
          />
        </section>
      ) : null}

      {/* ═══ 9. LITIGE ═══════════════════════════════════════════════════
       * La contestation n'a de sens que sur une intervention terminée ; le
         * litige ouvert reste affiché même après décision (traçabilité). */}
      {showDisputeSection ? (
        <section aria-label="Litige" className="space-y-3">
          {dispute ? (
            <div className="space-y-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={disputeStatusConfig(dispute.status).variant}>
                  Litige : {disputeStatusConfig(dispute.status).label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {disputeCategoryLabel(dispute.category)} • ouvert le {formatDate(dispute.createdAt)}
                </span>
              </div>
              <p className="whitespace-pre-line text-sm">{dispute.description}</p>
              {dispute.status === 'RESOLVED' || dispute.status === 'REJECTED' ? (
                <Alert
                  variant={dispute.status === 'RESOLVED' ? 'success' : 'neutral'}
                  dense
                  title={DISPUTE_STATUS_CONFIG[dispute.status as keyof typeof DISPUTE_STATUS_CONFIG]?.label ?? 'Décision'}
                >
                  {dispute.resolution ?? 'Décision enregistrée.'}
                </Alert>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Notre équipe examine votre contestation. La confirmation reste bloquée en attendant la décision.
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="secondary"
                onClick={() => {
                  setDisputeError(null);
                  setDisputeDialogOpen(true);
                }}
              >
                Contester l&apos;intervention
              </Button>
            </div>
          )}
        </section>
      ) : null}

      {/* ═══ ANNULATION — action de repli, jamais dans l'action prioritaire
       * (elle y prendrait la place du devis à accepter ou du bandeau
       * d'état). Le confirm reste polymorphe : le même dialogue sert aux
       * quatre kinds. */}
      {canCancel ? (
        <section aria-label="Annulation" className="border-t border-border pt-4">
          <Button
            onClick={() => setConfirmAction({ kind: 'cancel' })}
            variant="destructive"
            isLoading={actionBusy === 'CANCELED'}
          >
            Annuler la demande
          </Button>
        </section>
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

      <ConfirmDialog
        open={disputeDialogOpen}
        onCancel={() => {
          if (!disputeBusy) {
            setDisputeDialogOpen(false);
            setDisputeError(null);
          }
        }}
        onConfirm={handleOpenDispute}
        loading={disputeBusy}
        title="Contester l'intervention ?"
        description="Votre contestation sera examinée par notre équipe. La confirmation restera bloquée en attendant la décision."
        confirmLabel="Envoyer la contestation"
      >
        <div className="space-y-3">
          <Field htmlFor="disputeCategory" label="Motif" required>
            <Select
              id="disputeCategory"
              value={disputeCategory}
              onChange={(event) => setDisputeCategory(event.target.value as DisputeCategory)}
              disabled={disputeBusy}
            >
              {DISPUTE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {disputeCategoryLabel(category)}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            htmlFor="disputeDescription"
            label="Description"
            required
            hint={`${disputeDescriptionLength}/${DISPUTE_DESCRIPTION_MAX} caractères (minimum ${DISPUTE_DESCRIPTION_MIN}).`}
            error={
              disputeDescription.length > 0 && !disputeValid
                ? `Décrivez le problème en ${DISPUTE_DESCRIPTION_MIN} à ${DISPUTE_DESCRIPTION_MAX} caractères.`
                : null
            }
          >
            <Textarea
              id="disputeDescription"
              value={disputeDescription}
              onChange={(event) => setDisputeDescription(event.target.value)}
              maxLength={DISPUTE_DESCRIPTION_MAX}
              rows={4}
              placeholder="Expliquez ce qui ne vous satisfait pas dans l’intervention…"
              disabled={disputeBusy}
            />
          </Field>
          {disputeError ? <Alert variant="error">{disputeError}</Alert> : null}
        </div>
      </ConfirmDialog>
    </div>
  );
}

/* GPS V4 — section « Localisation du technicien » : carte du lieu
 * d'intervention + position récente du technicien (si fraîche, V3),
 * distance approximative et heure de mise à jour. Aucune coordonnée
 * chiffrée affichée ; aucun état ne bloque la page. */
function TravelMapSection({
  latitude,
  longitude,
  travel,
  travelMap,
}: {
  latitude: number | null;
  longitude: number | null;
  travel: NonNullable<DemandeListItem['travel']>;
  travelMap: DemandeListItem['travelMap'];
}) {
  const hasIntervention =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);
  const distance = travel.fresh ? formatTravelDistance(travel.distanceMeters) : null;
  const recency = formatTravelRecency(travel.minutesSinceUpdate);

  return (
    <Card>
      <CardContent className="space-y-3 pt-4 sm:pt-5">
        <SectionHeader title="Localisation du technicien" icon="pin" />
        {!hasIntervention ? (
          <Alert variant="neutral" dense>
            Lieu d&apos;intervention non localisé : la carte sera disponible une fois la position
            enregistrée.
          </Alert>
        ) : (
          <div className="space-y-2">
            <MissionMap
              intervention={{ latitude, longitude }}
              technician={travelMap?.technician ?? null}
            />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rounded-full bg-orange-500" />
                Lieu d&apos;intervention
              </span>
              {travelMap?.technician ? (
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="size-2.5 rounded-full bg-blue-600" />
                  Technicien{distance ? ` ${distance}` : ''}
                </span>
              ) : null}
              {travel.locationUpdatedAt ? (
                <span>
                  Dernière mise à jour : {formatDateTime(travel.locationUpdatedAt)}
                  {recency ? ` (${recency})` : ''}
                </span>
              ) : null}
            </div>
            {!travelMap?.technician && travel.enRoute ? (
              <Alert variant="neutral" dense>
                Dernière position indisponible ou trop ancienne.
              </Alert>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}