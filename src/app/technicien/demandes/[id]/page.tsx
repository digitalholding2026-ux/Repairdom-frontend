'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton, SkeletonCard, SkeletonRow } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field, Input } from '@/components/ui';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { DemandeStatusBadge, QuoteStatusBadge } from '@/components/ui/status-badge';
import { MissionInfo } from '@/components/mission/mission-info';
import { PushNotificationCard } from '@/components/ui/push-notification-card';
import { DiagnosticAudioPlayer } from '@/components/mission/diagnostic-audio-player';
import { FreeDiagnosticSection } from '@/components/technician/diagnostic/free-diagnostic-section';
import { DemandeMediaSection } from '@/components/mission/demande-media-section';
import { getTechnicianDemandeMediaFileUrl } from '@/lib/api/technician-service';
import { DemandeProgress } from '@/components/mission/demande-progress';
import { TravelSection } from '@/components/mission/travel-section';
import { MissionMap } from '@/components/mission/mission-map';
import { formatTravelDistance, formatTravelRecency } from '@/lib/travel-location';
import { MissionSummaryCard } from '@/components/mission/mission-summary';
import { ConversationSection } from '@/components/mission/conversation-section';
import { RatingSection } from '@/components/mission/rating-section';
import { RatingStars } from '@/components/ui/rating-stars';
import { fullName } from '@/lib/format';
import { toUserErrorMessage } from '@/lib/ui-error-message';
import { useToast } from '@/lib/toast-context';
import { kycStatusLabel } from '@/lib/technician-profile';
import {
  kycAcceptanceBanner,
  KYC_PAGE_HREF,
  type KycAcceptanceBanner,
} from '@/lib/technician-kyc-rules';
import { demandeStatusConfig } from '@/lib/request-status';
import { listMissionEvents, type MissionEvent } from '@/lib/api/mission-events-service';
import { getDispute, type DemandeDispute } from '@/lib/api/request-service';
import { formatFCFA } from '@/lib/format-fcfa';
import { useRealtime } from '@/lib/realtime/sse-context';
import { missionStreamUrl } from '@/lib/realtime/use-mission-stream';
import { useUserStream } from '@/lib/realtime/use-user-stream';
import { disputeCategoryLabel, disputeStatusConfig } from '@/lib/dispute-status';
import {
  getTechnicianDemande,
  acceptDemande,
  updateTechnicianDemandeStatus,
  getTechnicianProfile,
  getDiagnosticAudioUrl,
  listDemandeDiagnostics,
  listDemandeQuotes,
  createDemandeQuote,
  type TechnicianDemande,
  type MissionDiagnostic,
  type MissionQuote,
} from '@/lib/api/technician-service';
import { listEquipmentFamilies } from '@/lib/api/catalog-service';

const POLL_INTERVAL_MS = 5000;

function formatAmount(quote: Pick<MissionQuote, 'amount' | 'currency'>): string {
  return `${quote.amount.toLocaleString('fr-FR')} ${quote.currency}`;
}

function formatPrice(value: number | null | undefined): string {
  return formatFCFA(value);
}

/* Repli affichable si le statut KYC n'a pas encore été résolu alors que le
 * bandeau doit s'afficher : jamais de message vide, jamais d'écran cassé. */
const FALLBACK_KYC_BLOCKER: KycAcceptanceBanner = {
  variant: 'error',
  title: 'Vérifiez votre identité pour accepter des missions',
  description:
    'Vous pouvez consulter cette mission en détail, mais pas l’accepter tant que votre identité n’est pas vérifiée.',
  ctaLabel: 'Compléter ma vérification',
};

export default function TechnicianDemandeDetailPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
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
  const [technicianProfile, setTechnicianProfile] = useState<{
    kycStatus: string;
    kycRejectionReason?: string | null;
  } | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [diagnostics, setDiagnostics] = useState<MissionDiagnostic[]>([]);
  const [quotes, setQuotes] = useState<MissionQuote[]>([]);
  const [events, setEvents] = useState<MissionEvent[]>([]);
  /* Litige post-intervention : lecture seule (même endpoint partagé). */
  const [dispute, setDispute] = useState<DemandeDispute | null>(null);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [amountValue, setAmountValue] = useState('');
  const [quoteDescription, setQuoteDescription] = useState('');
  /* Codes familles « Autre appareil » → libellés affichables. */
  const [familyLabels, setFamilyLabels] = useState<Record<string, string>>({});
  /* IA-3 — rechargement immédiat après diagnostic libre (le polling 5 s
   * reprend ensuite ; le timer est simplement recréé, sans double appel). */
  const [refreshKey, setRefreshKey] = useState(0);
  /* Temps réel : les événements mission (statut, devis, GPS) redéclenchent
   * le chargement via refreshKey ; le chat gère ses messages lui-même. */
  const { status: realtimeStatus, subscribe } = useRealtime();
  const realtimeStatusRef = useRef(realtimeStatus);
  realtimeStatusRef.current = realtimeStatus;

  useEffect(() => {
    if (!params?.id) return;
    return subscribe(missionStreamUrl(params.id), (message) => {
      if (message.type === 'mission.message_created') return;
      setRefreshKey((key) => key + 1);
    });
  }, [params?.id, subscribe]);

  useEffect(() => {
    let active = true;
    listEquipmentFamilies()
      .then((list) => {
        if (active) {
          setFamilyLabels(Object.fromEntries(list.map((family) => [family.code, family.label])));
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

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

  /* Chantier #5A — le bandeau doit disparaître SANS rechargement quand l'admin
   * tranche le dossier. Seul le profil est refetché (jamais la mission), donc
   * la page ne flashe pas et l'utilisateur ne perd pas sa lecture. */
  useUserStream((message) => {
    if (
      message.type !== 'technician.kyc_verified' &&
      message.type !== 'technician.kyc_rejected'
    ) {
      return;
    }
    getTechnicianProfile()
      .then((profile) => {
        setTechnicianProfile(profile);
        setKycVerified(profile.kycStatus === 'VERIFIED');
      })
      .catch(() => undefined);
  });

  /* Chargement unique : premier passage complet (erreur affichée), puis
   * rafraîchissement silencieux toutes les 5 s (un seul timer). `refreshKey`
   * force un rechargement immédiat après une action (ex. diagnostic libre). */
  useEffect(() => {
    if (!params?.id) return;
    let active = true;    const load = async (initial: boolean) => {
      try {
        /* getTechnicianDemande est l'appel principal : seul son échec (ex.
         * mission acceptée par un concurrent) affiche « Demande
         * introuvable ». Diagnostics/devis sont optionnels avant
         * acceptation — les routes backend les réservent au technicien
         * assigné (requireAccess volontairement inchangé) : un 404 ici
         * signifie simplement « pas encore assigné », on utilise []. */
        const [d, diagnosticsList, quotesList, eventsList] = await Promise.all([
          getTechnicianDemande(params.id!),
          listDemandeDiagnostics(params.id!).catch(() => []),
          listDemandeQuotes(params.id!).catch(() => []),
          listMissionEvents(params.id!).catch(() => []),
        ]);
        if (!active) return;
        setDemande(d);
        setDiagnostics(diagnosticsList);
        setQuotes(quotesList);
        setEvents(eventsList);
        /* Litige : silencieux, jamais bloquant (null si aucun). */
        getDispute(params.id!)
          .then((result) => { if (active) setDispute(result); })
          .catch(() => undefined);
      } catch (err) {
        if (initial && active) setError(toUserErrorMessage(err, 'Erreur de chargement.'));
        // Erreur silencieuse en rafraîchissement périodique.
      } finally {
        if (initial && active) setLoading(false);
      }
    };

    load(true);
    /* UI-7 : tick ignoré onglet masqué ; reprise automatique au retour.
     * En mode SSE, le rechargement est piloté par les événements
     * (refreshKey) et le polling reste en fallback uniquement. */
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (realtimeStatusRef.current === 'sse') return;
      void load(false);
    }, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [params?.id, refreshKey]);

  const handleAccept = async () => {
    if (!params?.id) return;
    setActionBusy('ACCEPTED');
    setActionError(null);
    try {
      const updated = await acceptDemande(params.id);
      setDemande(updated);
      toast({ title: 'Mission acceptée.', variant: 'success' });
    } catch (err) {
      setActionError(toUserErrorMessage(err, 'Erreur lors de l\'acceptation.'));
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
      toast({ title: 'Statut mis à jour.', variant: 'success' });
    } catch (err) {
      setActionError(toUserErrorMessage(err, 'Erreur lors de la mise à jour.'));
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
      toast({ title: 'Intervention planifiée.', variant: 'success' });
    } catch (err) {
      setActionError(toUserErrorMessage(err, 'Erreur lors de la planification.'));
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
      toast({ title: 'Devis envoyé.', variant: 'success' });
    } catch (err) {
      setActionError(toUserErrorMessage(err, 'Erreur lors de la création du devis.'));
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
            Merci de vous rendre sur l’onglet Profil afin de terminer votre vérification.
          </Alert>
          <Link href={KYC_PAGE_HREF} className="block">
            <Button className="w-full" size="lg">
              Terminer ma vérification
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
  /* GPS V4 — carte de mission : lieu d'intervention + position personnelle
   * (données V1/V3 existantes, jamais de collecte supplémentaire). */
  const hasInterventionCoords =
    typeof demande.latitude === 'number' && typeof demande.longitude === 'number';
  const ownTravelPoint =
    demande.travel?.fresh &&
    demande.travel?.latitude !== null &&
    demande.travel?.latitude !== undefined &&
    demande.travel?.longitude !== null &&
    demande.travel?.longitude !== undefined
      ? { latitude: demande.travel.latitude, longitude: demande.travel.longitude }
      : null;
  /* Position transmise mais périmée (fenêtre V3 15 min) : le marqueur
   * n'est plus affiché comme position actuelle, ni ici ni côté client. */
  const hasStaleTravelPoint =
    !demande.travel?.fresh &&
    demande.travel?.latitude !== null &&
    demande.travel?.latitude !== undefined &&
    demande.travel?.longitude !== null &&
    demande.travel?.longitude !== undefined;
  const ownTravelDistance = demande.travel?.fresh
    ? formatTravelDistance(demande.travel.distanceMeters)
    : null;
  const ownTravelRecency = formatTravelRecency(demande.travel?.minutesSinceUpdate);
  const isPreAcceptance = canAccept;
  const kycRequired = canAccept && !kycVerified;
  /* Chantier #5A — contenu du bandeau. `kycRequired` implique un statut
   * non vérifié, donc le helper rend toujours un bandeau ici ; le repli
   * `FALLBACK_KYC_BLOCKER` couvre seulement le cas d'un statut `undefined`
   * (profil jamais chargé) sans faire planter le rendu. */
  const kycBlocker =
    kycAcceptanceBanner(
      technicianProfile?.kycStatus,
      technicianProfile?.kycRejectionReason,
    ) ?? FALLBACK_KYC_BLOCKER;
  const baseCanDiscuss = demande.status !== 'CANCELED' && demande.status !== 'CONFIRMED';
  const hasAcceptedQuote = quotes.some((q) => q.status === 'ACCEPTED');
  const catalogFlow = quotes.some((q) => q.source === 'CATALOG');
  const negotiationUnlocked =
    Boolean(demande.negotiationRequestedAt) || hasAcceptedQuote;
  const canDiscuss = baseCanDiscuss && (!catalogFlow || negotiationUnlocked);
  // Sprint 8.4 — Gouvernance du diagnostic : le diagnostic libre n'est
  // actif qu'une fois la mission ACCEPTED (le hub catalogue a été retiré :
  // diagnostic libre + devis via `FreeDiagnosticSection`).
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
          {/* Parcours « Autre appareil » — indice structuré affiché en
            * libellé (texte libre historique en repli). Information client,
            * jamais un diagnostic ; ne remplace pas le diagnostic libre. */}
          {!deviceLabel && (demande.equipmentFamily || demande.equipmentType) ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <Icon name="briefcase" size="sm" className="shrink-0 text-primary" />
              <p className="text-sm text-foreground">
                Appareil :{' '}
                {demande.equipmentFamily
                  ? familyLabels[demande.equipmentFamily] ?? demande.equipmentFamily
                  : demande.equipmentType}{' '}
                <span className="text-xs text-muted-foreground">(déclaré par le client)</span>
              </p>
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

          {/* Dépôt multimédia — visible immédiatement dès l'assignation
            (liaison en transaction à la création, URLs signées lazy). */}
          <DemandeMediaSection
            demandeId={demande.id}
            medias={demande.medias}
            fetchUrl={(demandeId, mediaId) => getTechnicianDemandeMediaFileUrl(demandeId, mediaId)}
          />

          {demande.status !== 'CANCELED' ? (
            <div className="space-y-3">
              <SectionHeader title="Avancement" />
              <div className="rounded-xl border border-border bg-card p-4">
                <DemandeProgress status={demande.status} />
              </div>
            </div>
          ) : null}

          {demande.technicianId ? (
            <TravelSection demande={demande} onChanged={(d) => setDemande(d)} />
          ) : null}

          {/* GPS V4 — carte de la mission (lieu + position personnelle).
              L'actualisation reste manuelle via la section Déplacement. */}
          {demande.technicianId && hasInterventionCoords ? (
            <div className="space-y-3">
              <SectionHeader title="Localisation de la mission" icon="pin" />
              <MissionMap
                intervention={{ latitude: demande.latitude as number, longitude: demande.longitude as number }}
                technician={ownTravelPoint}
              />
              {demande.travel?.enRoute && !ownTravelPoint ? (
                <Alert variant="neutral" dense>
                  Dernière position indisponible ou trop ancienne.
                </Alert>
              ) : null}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="size-2.5 rounded-full bg-orange-500" />
                  Lieu d&apos;intervention
                </span>
                {ownTravelPoint ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden className="size-2.5 rounded-full bg-blue-600" />
                    Ma position
                    {[ownTravelDistance, ownTravelRecency].filter(Boolean).length > 0
                      ? ` (${[ownTravelDistance, ownTravelRecency].filter(Boolean).join(' · ')})`
                      : ''}
                  </span>
                ) : hasStaleTravelPoint ? (
                  <span>Dernière position trop ancienne — pensez à l&apos;actualiser.</span>
                ) : (
                  <span>Aucune position transmise pour cette mission.</span>
                )}
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
              {/* Chantier #5A — bandeau ROUGE : l'acceptation est réellement
                  bloquée, ce n'est pas une simple recommandation. Le motif de
                  refus éventuel est repris ici : c'est lui qui dit au
                  technicien quoi corriger. */}
              <Alert
                variant={kycBlocker.variant}
                title={kycBlocker.title}
                action={
                  <Link href={KYC_PAGE_HREF}>
                    <Button variant="secondary" size="sm">
                      {kycBlocker.ctaLabel}
                    </Button>
                  </Link>
                }
              >
                <p>{kycBlocker.description}</p>
                <p className="mt-1 text-xs opacity-80">
                  Statut actuel : {kycStatusLabel(technicianProfile?.kycStatus ?? 'NOT_SUBMITTED')}.
                </p>
              </Alert>
              {/* Le bouton reste VISIBLE mais DÉSACTIVÉ : il montre ce que le
                  technicien perd s'il ne fait rien (la mission est à lui), sans
                  le laisser déclencher un 403 opaque. La lecture de la mission
                  reste entièrement accessible. */}
              <div className="space-y-1.5">
                <Button disabled className="w-full" size="lg">
                  Accepter la demande
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Vérification d’identité requise pour accepter cette mission.
                </p>
              </div>
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

          {/* Proposition contextuelle : suivre cette mission acceptée même
            app fermée (carte inline, jamais de popup). */}
          {demande.status === 'ACCEPTED' ? <PushNotificationCard compact /> : null}

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

          {/* Litige post-intervention : lecture seule (le client conteste,
              l'admin tranche). */}
          {dispute ? (
            <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={disputeStatusConfig(dispute.status).variant}>
                  Litige : {disputeStatusConfig(dispute.status).label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {disputeCategoryLabel(dispute.category)}
                </span>
              </div>
              <p className="whitespace-pre-line text-sm">{dispute.description}</p>
              {dispute.resolution ? (
                <p className="whitespace-pre-line text-sm text-muted-foreground">
                  Décision : {dispute.resolution}
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {events.length > 0 ? (
        <Link
          href={`/technicien/chronologies/${demande.id}`}
          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/50"
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

      {/* IA-3 — diagnostic libre + devis en un envoi (sans catalogue) :
        * après les éléments client, avant les parcours existants conservés. */}
      {canChooseDiagnostic && canProposeManualQuote ? (
        <FreeDiagnosticSection
          demandeId={demande.id}
          onDone={() => setRefreshKey((key) => key + 1)}
        />
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
              <Badge variant="neutral">Non référencé</Badge>
            ) : null}
            {latestDiagnostic?.mode === 'CATALOG' ? (
              <Badge variant="neutral">Catalogue</Badge>
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
              {latestDiagnostic.hasAudio ? (
                <DiagnosticAudioPlayer
                  demandeId={demande.id}
                  diagnosticId={latestDiagnostic.id}
                  diagnosticLabel={latestDiagnostic.content.slice(0, 60)}
                  fetchUrl={(demandeId, diagnosticId) =>
                    getDiagnosticAudioUrl(demandeId, diagnosticId)
                  }
                />
              ) : null}
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
                <span className="figure text-lg font-bold">{formatAmount(latestQuote)}</span>
                <QuoteStatusBadge status={latestQuote.status} />
              </div>
              <p className="whitespace-pre-line text-sm">{latestQuote.description}</p>
              {latestQuote.repair != null || latestQuote.travel != null || latestQuote.breakdown ? (
                <div className="space-y-1 rounded-lg border border-border bg-muted/20 p-3 text-sm tabular-nums">
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
                  Devis accepté. Vous pouvez maintenant planifier l&apos;intervention.
                </Alert>
              ) : null}
              {latestQuote.status === 'REJECTED' ? (
                <Alert variant="neutral" dense>
                  Devis refusé. Vous pouvez proposer un nouveau devis.
                </Alert>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Vous n&apos;avez pas encore proposé de devis.
            </p>
          )}

          {showQuoteForm ? (
            <div className="space-y-3 rounded-xl border border-border bg-card p-3">
              <Field htmlFor="quoteAmount" label="Montant (FCFA)">
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