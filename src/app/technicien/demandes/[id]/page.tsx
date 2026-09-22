'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton, SkeletonCard, SkeletonRow } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { Alert } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field, Input, Textarea } from '@/components/ui';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { DemandeStatusBadge, QuoteStatusBadge } from '@/components/ui/status-badge';
import { MissionInfo } from '@/components/mission/mission-info';
import { DemandeProgress } from '@/components/mission/demande-progress';
import { MissionSummaryCard } from '@/components/mission/mission-summary';
import { ConversationSection } from '@/components/mission/conversation-section';
import { RatingSection } from '@/components/mission/rating-section';
import { RatingStars } from '@/components/ui/rating-stars';
import { fullName } from '@/lib/format';
import { kycStatusLabel } from '@/lib/technician-profile';
import { demandeStatusConfig } from '@/lib/request-status';
import { listMissionEvents, type MissionEvent } from '@/lib/api/mission-events-service';
import {
  getTechnicianDemande,
  acceptDemande,
  updateTechnicianDemandeStatus,
  getTechnicianProfile,
  listDemandeDiagnostics,
  listDemandeQuotes,
  createDemandeQuote,
  getDemandeSuggestions,
  selectDemandeDiagnostic,
  type TechnicianDemande,
  type MissionDiagnostic,
  type MissionQuote,
  type DiagnosticSuggestion,
  type SuggestionIntervention,
} from '@/lib/api/technician-service';

const POLL_INTERVAL_MS = 5000;

function formatAmount(quote: Pick<MissionQuote, 'amount' | 'currency'>): string {
  return `${quote.amount.toLocaleString('fr-FR')} ${quote.currency}`;
}

function formatPrice(value: number | null | undefined): string {
  return value == null ? '—' : `${value.toLocaleString('fr-FR')} XAF`;
}

export default function TechnicianDemandeDetailPage() {
  const params = useParams<{ id: string }>();
  const [demande, setDemande] = useState<TechnicianDemande | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [scheduledValue, setScheduledValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  /* Phase A : l'erreur de chargement (pleine page, zone liste/détail) est
   * séparée des erreurs d'action (en ligne, zone boutons) — un échec
   * d'action ne doit plus s'afficher hors de sa zone. */
  const [actionError, setActionError] = useState<string | null>(null);
  /* Phase A : « Marquer comme terminée » déclenche le règlement — confirmation exigée. */
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [kycVerified, setKycVerified] = useState(true);
  const [technicianProfile, setTechnicianProfile] = useState<{ kycStatus: string } | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [diagnostics, setDiagnostics] = useState<MissionDiagnostic[]>([]);
  const [quotes, setQuotes] = useState<MissionQuote[]>([]);
  const [events, setEvents] = useState<MissionEvent[]>([]);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [amountValue, setAmountValue] = useState('');
  const [quoteDescription, setQuoteDescription] = useState('');
  const [suggestions, setSuggestions] = useState<DiagnosticSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [showManualCatForm, setShowManualCatForm] = useState(false);
  const [manualContent, setManualContent] = useState('');
  const [manualRecommendation, setManualRecommendation] = useState('');
  const [manualProposedIntervention, setManualProposedIntervention] = useState('');
  const [manualJustification, setManualJustification] = useState('');
  const [manualNotes, setManualNotes] = useState('');

  /* Profil KYC chargé INDÉPENDAMMENT du succès mission : en cas d’échec de
   * `getTechnicianDemande` (404 backend), le diagnostic « non VERIFIED » doit
   * rester disponible pour afficher le message métier au lieu de
   * « Demande introuvable ». Un fetch chaîné après succès mission ne couvre
   * jamais le cas d’erreur (cause du correctif précédent inopérant). */
  useEffect(() => {
    if (!params?.id) return;
    let active = true;
    getTechnicianProfile()
      .then((profile) => {
        if (!active) return;
        setTechnicianProfile(profile);
        if (profile) setKycVerified(profile.kycStatus === 'VERIFIED');
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setProfileLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [params?.id]);

  /* Chargement unique : premier passage complet (erreur affichée), puis
   * rafraîchissement silencieux toutes les 5 s (un seul timer). */
  useEffect(() => {
    if (!params?.id) return;
    let active = true;

    const load = async (initial: boolean) => {
      try {
        const [d, diagnosticsList, quotesList, eventsList] = await Promise.all([
          getTechnicianDemande(params.id!),
          listDemandeDiagnostics(params.id!),
          listDemandeQuotes(params.id!),
          listMissionEvents(params.id!).catch(() => []),
        ]);
        if (!active) return;
        setDemande(d);
        setDiagnostics(diagnosticsList);
        setQuotes(quotesList);
        setEvents(eventsList);
      } catch (err) {
        if (initial && active) setError(err instanceof Error ? err.message : 'Erreur de chargement.');
        // Erreur silencieuse en rafraîchissement périodique.
      } finally {
        if (initial && active) setLoading(false);
      }
    };

    load(true);
    const timer = setInterval(() => load(false), POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [params?.id]);

  const handleAccept = async () => {
    if (!params?.id) return;
    setActionBusy('ACCEPTED');
    setActionError(null);
    try {
      const updated = await acceptDemande(params.id);
      setDemande(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors de l\'acceptation.');
    } finally {
      setActionBusy(null);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!params?.id) return;
    setActionBusy(status);
    setActionError(null);
    try {
      const updated = await updateTechnicianDemandeStatus(params.id, status);
      setDemande(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour.');
    } finally {
      setActionBusy(null);
    }
  };

  const handleSchedule = async () => {
    if (!params?.id) return;
    setActionBusy('SCHEDULED');
    setActionError(null);
    try {
      const updated = await updateTechnicianDemandeStatus(
        params.id,
        'SCHEDULED',
        new Date(scheduledValue).toISOString(),
      );
      setDemande(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors de la planification.');
    } finally {
      setActionBusy(null);
    }
  };

  const handleCreateQuote = async () => {
    if (!params?.id) return;
    const amount = Number(amountValue);
    if (!Number.isInteger(amount) || amount <= 0) {
      setActionError('Veuillez saisir un montant valide (entier, supérieur à 0).');
      return;
    }
    const description = quoteDescription.trim();
    if (!description) {
      setActionError('Veuillez décrire la proposition.');
      return;
    }
    setActionBusy('QUOTE');
    setActionError(null);
    try {
      const created = await createDemandeQuote(params.id, { amount, description });
      setQuotes((prev) => [created, ...prev]);
      setAmountValue('');
      setQuoteDescription('');
      setShowQuoteForm(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors de la création du tarif.');
    } finally {
      setActionBusy(null);
    }
  };

  const handleLoadSuggestions = async () => {
    if (!params?.id) return;
    setSuggestionsOpen(true);
    setSuggestionsLoading(true);
    setSuggestionsError(null);
    try {
      const res = await getDemandeSuggestions(params.id);
      setSuggestions(res.suggestions);
    } catch (err) {
      setSuggestionsError(
        err instanceof Error ? err.message : 'Erreur lors du chargement des diagnostics compatibles.',
      );
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleSelectCatalogDiagnostic = async (diagId: string, intervention: SuggestionIntervention) => {
    if (!params?.id) return;
    setActionBusy(`catalog:${intervention.id}`);
    setActionError(null);
    try {
      const result = await selectDemandeDiagnostic(params.id, {
        mode: 'CATALOG',
        catalogDiagnosticId: diagId,
        catalogInterventionId: intervention.id,
      });
      if (result.quote) setQuotes((prev) => [result.quote!, ...prev]);
      if (result.diagnostic) setDiagnostics((prev) => [result.diagnostic, ...prev]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors de la sélection du diagnostic.');
    } finally {
      setActionBusy(null);
    }
  };

  const handleManualSelect = async () => {
    if (!params?.id) return;
    const content = manualContent.trim();
    if (content.length < 10) {
      setActionError('Décrivez le diagnostic observé (10 caractères minimum).');
      return;
    }
    const proposedIntervention = manualProposedIntervention.trim();
    if (proposedIntervention.length < 5) {
      setActionError('Décrivez l’intervention proposée (5 caractères minimum).');
      return;
    }
    const justification = manualJustification.trim();
    if (justification.length < 5) {
      setActionError('Justifiez le diagnostic (5 caractères minimum).');
      return;
    }
    setActionBusy('catalog:manual');
    setActionError(null);
    try {
      const result = await selectDemandeDiagnostic(params.id, {
        mode: 'MANUAL',
        content,
        recommendation: manualRecommendation.trim() || undefined,
        proposedIntervention,
        justification,
        notes: manualNotes.trim() || undefined,
      });
      if (result.diagnostic) setDiagnostics((prev) => [result.diagnostic, ...prev]);
      setShowManualCatForm(false);
      setManualContent('');
      setManualRecommendation('');
      setManualProposedIntervention('');
      setManualJustification('');
      setManualNotes('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors de l’enregistrement.');
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
    // Diagnostic réel « technicien non KYC VERIFIED » : le profil est chargé
    // et non vérifié au moment de l’échec. Le backend répond 404
    // « Demande introuvable » (mission déjà attribuée, statut changé ou
    // inéligible) sans distinguer ce cas côté lecture — volontairement, pour
    // ne pas exposer l’existence des missions. On affiche donc ici un message
    // métier actionnable au lieu d’une erreur serveur trompeuse. Tout autre
    // cas (profil vérifié ou inconnu) garde le comportement inchangé.
    if (technicianProfile !== null && !kycVerified) {
      return (
        <div className="space-y-4">
          <Alert variant="info" title="Vérification d’identité requise">
            Désolé, vous ne pouvez pas accepter de mission sans avoir vérifié votre identité.
            Merci de vous rendre sur l’onglet Profil afin de terminer votre KYC.
          </Alert>
          <Link href="/technicien/profil" className="block">
            <Button className="w-full" size="lg">
              Terminer mon KYC
            </Button>
          </Link>
          <Link href="/technicien/demandes" className="block">
            <Button variant="secondary" className="w-full">
              Retour aux missions
            </Button>
          </Link>
        </div>
      );
    }
    // Profil pas encore résolu : ne pas flasher l’erreur générique avant de
    // savoir si le cas KYC s’applique.
    if (!profileLoaded) {
      return (
        <div className="space-y-4 py-2" role="status">
          <span className="sr-only">Chargement…</span>
          <SkeletonCard />
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <Alert variant="error">{error}</Alert>
        <Link href="/technicien/demandes">
          <Button variant="secondary">Retour aux missions</Button>
        </Link>
      </div>
    );
  }

  if (!demande) return null;

  const canAccept = demande.status === 'SUBMITTED' || demande.status === 'PENDING';
  const isPreAcceptance = canAccept;
  const kycRequired = canAccept && !kycVerified;
  const baseCanDiscuss = demande.status !== 'CANCELED' && demande.status !== 'CONFIRMED';
  const hasAcceptedQuote = quotes.some((q) => q.status === 'ACCEPTED');
  const catalogFlow = quotes.some((q) => q.source === 'CATALOG');
  const negotiationUnlocked =
    Boolean(demande.negotiationRequestedAt) || hasAcceptedQuote;
  const canDiscuss = baseCanDiscuss && (!catalogFlow || negotiationUnlocked);
  const hasPendingCatalogQuote = quotes.some(
    (q) => q.source === 'CATALOG' && q.status === 'PENDING',
  );
  // Sprint 8.4 — Gouvernance du diagnostic : le hub « Choisir un diagnostic »
  // (catalogue + non référencé) n'est actif qu'une fois la mission ACCEPTED.
  const canChooseDiagnostic = demande.status === 'ACCEPTED';
  const canProposeManualQuote =
    demande.status === 'ACCEPTED' &&
    (!catalogFlow || (Boolean(demande.negotiationRequestedAt) && !hasAcceptedQuote));
  const latestDiagnostic = diagnostics[0] ?? null;
  const latestQuote = quotes[0] ?? null;
  const lastActivityLabel =
    events.length > 0
      ? events[events.length - 1].label
      : demandeStatusConfig(demande.status, 'technician').label;
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

          {actionError ? <Alert variant="error">{actionError}</Alert> : null}

          {canAccept && kycRequired ? (
            <div className="space-y-3">
              <Alert variant="warning" title="Vérification requise">
                <p>
                  Cette mission est disponible, mais votre compte doit être validé avant de
                  pouvoir l’accepter
                  (statut actuel : {kycStatusLabel(technicianProfile?.kycStatus ?? 'NOT_SUBMITTED')}).
                </p>
              </Alert>
              <Link href="/technicien/profil">
                <Button variant="secondary" className="w-full" size="lg">
                  Compléter mon KYC
                </Button>
              </Link>
            </div>
          ) : null}

          {canAccept && !kycRequired ? (
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
              onClick={() => setConfirmFinish(true)}
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

      {events.length > 0 ? (
        <Link
          href={`/technicien/chronologies/${demande.id}`}
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

      {canChooseDiagnostic ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="briefcase" size="sm" className="text-muted-foreground" />
                Choisir un diagnostic
              </CardTitle>
              {demande.domain && !suggestionsLoading ? (
                <Button size="sm" onClick={handleLoadSuggestions}>
                  <Icon name="search" size="3.5" />
                  Choisir dans le catalogue
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {demande.domain ? (
              <>
                {suggestionsOpen && hasPendingCatalogQuote ? (
                  <Alert variant="info" dense icon="info">
                    Un tarif automatique est déjà en attente de la décision du client.
                  </Alert>
                ) : null}
                {suggestionsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Spinner />
                  </div>
                ) : suggestionsError ? (
                  <div className="space-y-2">
                    <Alert variant="error">
                      {suggestionsError}
                    </Alert>
                    <Button variant="secondary" size="sm" onClick={handleLoadSuggestions}>
                      Réessayer
                    </Button>
                  </div>
                ) : !suggestionsOpen ? (
                  <p className="text-sm text-muted-foreground">
                    Choisissez un diagnostic du catalogue pour envoyer automatiquement le tarif
                    Relio au client, ou déclarez un diagnostic non référencé ci-dessous.
                  </p>
                ) : suggestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun diagnostic compatible n&apos;a été trouvé pour cet appareil.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {suggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className="space-y-2 rounded-xl border border-border bg-card p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold">{suggestion.name}</p>
                          {suggestion.score > 0 ? (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              Pertinence : {suggestion.score}
                            </span>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          {suggestion.interventions.map((intervention) => (
                            <div
                              key={intervention.id}
                              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{intervention.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {intervention.pricing?.referencePrice != null ? (
                                    <>Réf. {formatPrice(intervention.pricing.referencePrice)}</>
                                  ) : (
                                    'Barème non défini'
                                  )}
                                  {intervention.pricing?.minPrice != null &&
                                  intervention.pricing?.maxPrice != null ? (
                                    <>
                                      {' '}· {formatPrice(intervention.pricing.minPrice)} –{' '}
                                      {formatPrice(intervention.pricing.maxPrice)}
                                    </>
                                  ) : null}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="shrink-0"
                                disabled={hasPendingCatalogQuote}
                                isLoading={actionBusy === `catalog:${intervention.id}`}
                                onClick={() => handleSelectCatalogDiagnostic(suggestion.id, intervention)}
                              >
                                Sélectionner
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : null}

            {!showManualCatForm ? (
              <Button variant="ghost" size="sm" onClick={() => setShowManualCatForm(true)}>
                <Icon name="plus" size="3.5" />
                + Diagnostic non référencé
              </Button>
            ) : (
              <div className="space-y-3 rounded-xl border border-border bg-card p-3">
                <Field htmlFor="manualCatContent" label="Diagnostic observé *">
                  <Textarea
                    id="manualCatContent"
                    value={manualContent}
                    onChange={(event) => setManualContent(event.target.value)}
                    maxLength={1000}
                    rows={2}
                    placeholder="Ex. : problème de carte mère non répertorié."
                  />
                </Field>
                <Field htmlFor="manualCatIntervention" label="Intervention proposée *">
                  <Input
                    id="manualCatIntervention"
                    value={manualProposedIntervention}
                    onChange={(event) => setManualProposedIntervention(event.target.value)}
                    maxLength={500}
                    placeholder="Ex. : remplacement de la carte mère avec test complet."
                  />
                </Field>
                <Field htmlFor="manualCatJustification" label="Justification *">
                  <Textarea
                    id="manualCatJustification"
                    value={manualJustification}
                    onChange={(event) => setManualJustification(event.target.value)}
                    maxLength={1000}
                    rows={2}
                    placeholder="Ex. : les tests sur l&apos;écran, la batterie et le chargeur sont concluants."
                  />
                </Field>
                <Field htmlFor="manualCatNotes" label="Note complémentaire (facultatif)">
                  <Textarea
                    id="manualCatNotes"
                    value={manualNotes}
                    onChange={(event) => setManualNotes(event.target.value)}
                    maxLength={1000}
                    rows={2}
                    placeholder="Ex. : pièce à commander auprès du fournisseur habituel."
                  />
                </Field>
                <Field htmlFor="manualCatReco" label="Recommandation (facultatif)">
                  <Input
                    id="manualCatReco"
                    value={manualRecommendation}
                    onChange={(event) => setManualRecommendation(event.target.value)}
                    maxLength={1000}
                    placeholder="Ex. : diagnostic approfondi requis dans un centre agréé."
                  />
                </Field>
                <Button
                  onClick={handleManualSelect}
                  isLoading={actionBusy === 'catalog:manual'}
                  className="w-full"
                >
                  Enregistrer le diagnostic
                </Button>
                <p className="text-xs text-muted-foreground">
                  Le tarif manuel est réservé à ce parcours : aucun tarif automatique n&apos;est
                  envoyé, vous proposerez ensuite votre propre tarif.
                </p>
              </div>
            )}

            {demande.domain ? (
              <p className="text-xs text-muted-foreground">
                La sélection d&apos;un diagnostic du catalogue envoie automatiquement le tarif
                Relio au client.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Aucune référence catalogue n&apos;est associée à cette mission : déclarez un
                diagnostic non référencé puis proposez votre tarif.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {['ACCEPTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CONFIRMED'].includes(demande.status) ? (
        <MissionSummaryCard demandeId={demande.id} title="Récapitulatif de la mission" />
      ) : null}

      {baseCanDiscuss && (catalogFlow ? negotiationUnlocked : true) ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon name="chat" size="sm" className="text-muted-foreground" />
              Discussion avec le client
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ConversationSection
              demandeId={demande.id}
              canSend={canDiscuss}
              peerName={demande.client ? fullName(demande.client.firstName, demande.client.lastName) : null}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon name="file" size="sm" className="text-muted-foreground" />
              Diagnostic
            </CardTitle>
            {latestDiagnostic?.mode === 'MANUAL' ? (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Non référencé
              </span>
            ) : null}
            {latestDiagnostic?.mode === 'CATALOG' ? (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Catalogue
              </span>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isPreAcceptance && !latestDiagnostic ? (
            <Alert variant="neutral" icon="shield" title="Diagnostic verrouillé">
              <p>
                🔒 Acceptez d&apos;abord la mission pour établir un diagnostic.
              </p>
            </Alert>
          ) : null}
          {latestDiagnostic ? (
            <div className="space-y-2">
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
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Vous n&apos;avez pas encore publié de diagnostic.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon name="badge-check" size="sm" className="text-muted-foreground" />
              Proposition tarifaire
            </CardTitle>
            {canProposeManualQuote ? (
              <Button variant="secondary" size="sm" onClick={() => setShowQuoteForm((v) => !v)}>
                <Icon name="plus" size="3.5" />
                Proposer un tarif
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {catalogFlow && !negotiationUnlocked ? (
            <Alert variant="info" dense icon="info">
              Le tarif automatique Relio est en attente de la décision du client (acceptation ou
              demande de négociation).
            </Alert>
          ) : null}
          {latestQuote ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-lg font-bold">{formatAmount(latestQuote)}</span>
                <QuoteStatusBadge status={latestQuote.status} />
              </div>
              <p className="whitespace-pre-line text-sm">{latestQuote.description}</p>
              {latestQuote.repair != null || latestQuote.travel != null || latestQuote.breakdown ? (
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
                  <div className="my-1 h-px bg-border" />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Total client (brut)</span>
                    <span className="font-semibold">{formatPrice(latestQuote.totalToDebit ?? ((latestQuote.repair ?? latestQuote.amount) + (latestQuote.travel ?? 0)))}</span>
                  </div>
                </div>
              ) : null}
              {demande.status === 'CONFIRMED' && latestQuote ? (
                <Alert variant="info" dense icon="info">
                  Commission Relio (2 % du brut) prélevée sur ce tarif. Votre gain net pour cette
                  intervention apparaît dans l&apos;onglet Revenus.
                </Alert>
              ) : null}
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

      <ConfirmDialog
        open={confirmFinish}
        onCancel={() => setConfirmFinish(false)}
        onConfirm={() => {
          setConfirmFinish(false);
          void handleStatusChange('COMPLETED');
        }}
        loading={actionBusy === 'COMPLETED'}
        title="Marquer comme terminée ?"
        description="L’intervention passera en attente de confirmation du client. Cette action déclenche le calcul du règlement (brut, commission Relio 2 %, net)."
        confirmLabel="Marquer comme terminée"
      />
    </div>
  );
}