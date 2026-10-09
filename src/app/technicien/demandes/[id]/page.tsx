'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton, SkeletonCard, SkeletonRow } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field, Input } from '@/components/ui';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Tabs, type TabItem } from '@/components/ui/tabs';
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
import {
  MIN_QUOTE_AMOUNT_XAF,
  TECHNICIAN_FEE_LABEL,
  isQuoteAmountAllowed,
  previewTechnicianQuote,
  quoteAmountError,
} from '@/lib/technician-quote';
import { relioAbsorbsTransferFeesNote } from '@/lib/saspay-relio-absorbs-fees';
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

/* CHANTIER 6B — hiérarchie de l'écran mission technicien.
 *
 * La page est passée d'un empilement de 21 blocs (dont une card unique de 260
 * lignes) à un header permanent + 4 onglets contextuels :
 *
 *   Aperçu           — ce que le technicien sait de la mission
 *   Diagnostic & Devis — ce qu'il produit (diagnostic + proposition tarifaire)
 *   Discussion       — l'échange avec le client
 *   Détails          — litige, chronologie, push, avis, récapitulatif
 *
 * L'onglet par défaut est choisi UNE fois, au premier rendu, selon le statut.
 * Il n'est jamais resynchronisé ensuite : un technicien qui est en train de
 * lire un message ne doit pas voir l'onglet sauter sous ses doigts quand un
 * événement SSE arrive. L'onglet est donc une préférence d'utilisateur, pas un
 * effet de bord du statut.
 *
 * Ce que le chantier NE touche PAS :
 *   - les 4 `useEffect`, les 2 flux SSE (`missionStreamUrl` + `useUserStream`),
 *     le polling 5 s et ses deux gardes ;
 *   - les appels API et leur séquence ;
 *   - les 4 points de contrôle KYC (variable, bandeau, bouton désactivé,
 *     écran d'erreur 404, squelette intermédiaire) ;
 *   - les gestionnaires `handleAccept` / `handleSchedule` /
 *     `handleStatusChange` / `handleCreateQuote` ;
 *   - `FreeDiagnosticSection` et son hook, et tous les composants partagés.
 *
 * ⚠️ RÈGLE DES HOOKS : les 3 returns anticipés (`loading`,
 * `error && !demande` avec le cas KYC imbriqué, `!demande`) restent SOUS le
 * dernier hook. Aucun `useX` ne doit être ajouté après — verrouillé par
 * `technician-quote.test.ts` l.233.
 */

const POLL_INTERVAL_MS = 5000;

/** Les 4 onglets de l'écran technicien. */
const TAB_OVERVIEW = 'overview';
const TAB_DIAGNOSTIC = 'diagnostic';
const TAB_DISCUSSION = 'discussion';
const TAB_DETAILS = 'details';
type MissionTab = typeof TAB_OVERVIEW | typeof TAB_DIAGNOSTIC | typeof TAB_DISCUSSION | typeof TAB_DETAILS;

/**
 * Onglet ouvert au premier rendu.
 *
 * Un technicien vient d'accepter une mission (`ACCEPTED`) et n'a encore rien
 * produit : l'onglet « Diagnostic & Devis » est celui qui l'attend. Partir sur
 * « Aperçu » lui ferait parcourir la mission avant d'y travailler. Dans tous
 * les autres cas — y compris quand un devis est déjà accepté — l'aperçu est le
 * point d'entrée naturel.
 *
 * Volontairement calculé UNE FOIS et jamais resynchronisé : voir l'en-tête.
 */
function defaultTabFor(status: string, hasAcceptedQuote: boolean): MissionTab {
  return status === 'ACCEPTED' && !hasAcceptedQuote ? TAB_DIAGNOSTIC : TAB_OVERVIEW;
}

/* RÈGLE FCFA : tout montant passe par `formatFCFA`. La devise du devis n'est
 * affichée que si elle diffère de XAF (le backend envoie toujours XAF). */
function formatAmount(quote: Pick<MissionQuote, 'amount' | 'currency'>): string {
  const formatted = formatFCFA(quote.amount);
  return quote.currency && quote.currency !== 'XAF' ? `${formatted} (${quote.currency})` : formatted;
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
  /* CHANTIER 6C-1 — état du chargement du profil technicien.
   *
   * AVANT : l'échec réseau de la lecture du profil était avalé et
   * `kycVerified` gardait sa valeur par défaut (optimiste). Conséquence
   * reproduite en production : bouton « Accepter la demande » actif, clic,
   * refus 403 que le technicien ne comprend pas.
   *
   * MAINTENANT : `error` est un état affiché, pas un silence. Tant que le
   * statut n'est pas connu, l'acceptation reste bloquée — c'est le seul
   * arbitrage sûr : on préfère refuser une action à l'utilisateur plutôt que
   * de la laisser déclencher une erreur qu'il ne peut pas interpréter. */
  const [profileLoadState, setProfileLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  /* Incrémenté par le bouton « Réessayer » pour relancer la lecture du profil. */
  const [profileReloadKey, setProfileReloadKey] = useState(0);
  const [diagnostics, setDiagnostics] = useState<MissionDiagnostic[]>([]);
  const [quotes, setQuotes] = useState<MissionQuote[]>([]);
  const [events, setEvents] = useState<MissionEvent[]>([]);
  /* CHANTIER 6C-1 — la chronologie distingue « vide » de « chargement échoué ».
   * Un tableau vide est un état normal (mission jeune) ; une liste vide à
   * cause d'une erreur réseau ne doit pas laisser croire qu'il ne s'est rien
   * passé. */
  const [eventsLoadState, setEventsLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  /* Litige post-intervention : lecture seule (même endpoint partagé). */
  const [dispute, setDispute] = useState<DemandeDispute | null>(null);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [amountValue, setAmountValue] = useState('');
  const [quoteDescription, setQuoteDescription] = useState('');
  /* Codes familles « Autre appareil » → libellés affichables. */
  const [familyLabels, setFamilyLabels] = useState<Record<string, string>>({});
  /* 6C-1 (optionnel) : les libellés de famille « Autre appareil » sont un
     complément cosmétique. Leur échec réseau ne bloque rien, mais il ne doit
     pas être invisible : le code brut s'affiche alors à la place du libellé,
     et le technicien doit comprendre pourquoi. */
  const [familyLabelsFailed, setFamilyLabelsFailed] = useState(false);
  /* IA-3 — rechargement immédiat après diagnostic libre (le polling 5 s
   * reprend ensuite ; le timer est simplement recréé, sans double appel). */
  const [refreshKey, setRefreshKey] = useState(0);
  /* Onglet actif (chantier 6B). Initialisé au premier rendu, jamais resynchronisé. */
  const [activeTab, setActiveTab] = useState<MissionTab>(TAB_OVERVIEW);
  /* La mission est-elle chargée au moins une fois ? Sert à choisir l'onglet
   * par défaut à la première arrivée des données, sans effet au refetch. */
  const [tabInitialized, setTabInitialized] = useState(false);
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
      .catch(() => {
        // 6C-1 : l'échec est signalé dans l'UI (badge « Libellé non
        // disponible »), pas seulement dans la console — un code brut affiché
        // sans explication ressemble à une donnée erronée.
        if (active) setFamilyLabelsFailed(true);
        console.warn('[mission] Libellés de famille indisponibles, repli sur le code brut.');
      });
    return () => {
      active = false;
    };
  }, []);

  /* Profil KYC chargé INDÉPENDAMMENT du succès mission : en cas d'échec de
   * `getTechnicianDemande` (404 backend), le diagnostic « non VERIFIED » doit
   * rester disponible pour afficher le message métier au lieu de
   * « Demande introuvable ». Un fetch chaîné après succès mission ne couvre
   * jamais le cas d'erreur (cause du correctif précédent inopérant). */
  useEffect(() => {
    if (!params?.id) return;
    let active = true;
    setProfileLoadState('loading');

    getTechnicianProfile()
      .then((profile) => {
        if (!active) return;
        setTechnicianProfile(profile);
        if (profile) setKycVerified(profile.kycStatus === 'VERIFIED');
        setProfileLoadState('loaded');
      })
      .catch(() => {
        if (!active) return;
        // 6C-1 : l'échec est un état affiché, plus un silence. `kycVerified`
        // reste à `true` (valeur par défaut) mais `profileLoadState` bloque
        // l'acceptation : aucun 403 opaque ne peut plus être déclenché.
        setProfileLoadState('error');
      })
      .finally(() => {
        if (active) setProfileLoaded(true);
      });
    return () => {
      active = false;
    };
    /* `profileReloadKey` : relance manuelle via le bouton « Réessayer ». */
  }, [params?.id, profileReloadKey]);

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
        setProfileLoadState('loaded');
      })
      .catch(() => {
        // 6C-1 : un flux SSE qui n'aboutit pas ne doit pas laisser le
        // technicien dans l'incertitude sur son statut d'identité.
        setProfileLoadState('error');
      });
  });

  /* Chargement unique : premier passage complet (erreur affichée), puis
   * rafraîchissement silencieux toutes les 5 s (un seul timer). `refreshKey`
   * force un rechargement immédiat après une action (ex. diagnostic libre). */
  useEffect(() => {
    if (!params?.id) return;
    let active = true;
    const load = async (initial: boolean) => {
      try {
        /* getTechnicianDemande est l'appel principal : seul son échec (ex.
         * mission acceptée par un concurrent) affiche « Demande
         * introuvable ». Diagnostics/devis sont optionnels avant
         * acceptation — les routes backend les réservent au technicien
         * assigné (requireAccess volontairement inchangé) : un 404 ici
         * signifie simplement « pas encore assigné », on utilise []. */
        const [d, diagnosticsList, quotesList, eventsResult] = await Promise.all([
          getTechnicianDemande(params.id!),
          listDemandeDiagnostics(params.id!).catch(() => []),
          listDemandeQuotes(params.id!).catch(() => []),
          // 6C-1 : la chronologie note son propre échec au lieu de le confondre
          // avec une mission sans historique.
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
      // Un technicien qui vient d'accepter a une mission à produire : on
      // l'amène directement là où elle se fait. Seul moment où l'onglet suit
      // le statut — c'est la suite de SON clic, pas un effet de bord d'un
      // événement entrant.
      setActiveTab(TAB_DIAGNOSTIC);
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
    /* Seuil 5 000 FCFA + aperçu : une seule source de vérité côté UI
     * (`@/lib/technician-quote`), le backend revalide de toute façon. */
    const { amount, error: amountError } = quoteAmountError(amountValue);
    if (amountError || amount === null) {
      setActionError(amountError ?? 'Veuillez saisir un montant valide (entier, supérieur à 0).');
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
    // et non vérifié au moment de l'échec. Le backend répond 404
    // « Demande introuvable » (mission déjà attribuée, statut changé ou
    // inéligible) sans distinguer ce cas côté lecture — volontairement, pour
    // ne pas exposer l'existence des missions. On affiche donc ici un message
    // métier actionnable au lieu d'une erreur serveur trompeuse. Tout autre
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
    // Profil pas encore résolu : ne pas flasher l'erreur générique avant de
    // savoir si le cas KYC s'applique.
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
  /* CHANTIER 6C-1 — le statut d'identité est-il connu ET vérifié ?
   *
   * `loading` : on ne sait pas encore. L'acceptation est bloquée par défaut —
   * laisser passer produirait un refus 403 que le technicien ne comprend pas.
   * `loaded` + non vérifié : blocage métier, motif de refus affiché.
   * `error`   : blocage technique, bandeau « Réessayer » affiché.
   * Un seul cas l'acceptation : statut connu ET vérifié. */
  const kycRequired = canAccept && (profileLoadState !== 'loaded' || !kycVerified);
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

  /* Chantier 4-FONDATIONS-A — soumission du devis : seuil de 5 000 FCFA,
   * bouton bloqué tant que le devis est hors bornes ou sans description.
   * Source unique : `@/lib/technician-quote` (le backend revalide).
   * Le rendu est dans `QuoteForm`, plus bas dans ce même fichier. */
  const parsedQuote = quoteAmountError(amountValue);
  const canSubmitQuote =
    !actionBusy &&
    parsedQuote.amount !== null &&
    !parsedQuote.error &&
    isQuoteAmountAllowed(parsedQuote.amount) &&
    quoteDescription.trim().length > 0;

  /* Choix de l'onglet par défaut, À LA PREMIÈRE ARRIVÉE des données
   * seulement (donc avant tout rendu visible : ce n'est pas un saut
   * d'onglet, c'est le premier affichage). */
  const chosenTab = defaultTabFor(demande.status, hasAcceptedQuote);
  if (!tabInitialized) {
    setActiveTab(chosenTab);
    setTabInitialized(true);
  }
  const visibleTab = tabInitialized ? activeTab : chosenTab;

  const deviceLabel = [
    demande.domain?.name,
    demande.brand?.name,
    demande.model?.name,
    demande.problem?.name,
  ]
    .filter(Boolean)
    .join(' — ');
  const lastActivityLabel =
    events.length > 0
      ? events[events.length - 1].label
      : demandeStatusConfig(demande.status, 'technician').label;

  /* ── Conditions strictes d'onglet (chantier 6B) ──────────────────────
   * Le diagnostic et le devis étaient deux cards rendues TOUJOURS, y compris
   * sur une mission annulée : ils deviennent conditionnels. */
  const showDiagnostic = latestDiagnostic !== null || canChooseDiagnostic;
  const showQuote = quotes.length > 0 || canProposeManualQuote;
  const showMedias = demande.medias.length > 0;
  /* 6C-1 : une chronologie en erreur n'est PAS une mission sans historique.
     L'onglet Détails affiche un état explicite avec « Réessayer ». */
  const timelineFailed = eventsLoadState === 'error';

  const TAB_ITEMS: readonly TabItem[] = [
    { id: TAB_OVERVIEW, label: 'Aperçu' },
    { id: TAB_DIAGNOSTIC, label: 'Diagnostic & Devis' },
    { id: TAB_DISCUSSION, label: 'Discussion' },
    { id: TAB_DETAILS, label: 'Détails' },
  ];

  return (
    <div className="space-y-5">
      {/* ═══ HEADER PERMANENT ═══════════════════════════════════════════
       * Ce qui identifie la mission et ce qu'il faut faire maintenant,
       * au-dessus des onglets : il reste visible quel que soit l'onglet. */}
      <PageHeader title="Détail de la demande" backHref="/technicien" />

      <TechnicianHeader
        demande={demande}
        actionError={actionError}
        actionBusy={actionBusy}
        canAccept={canAccept}
        kycRequired={kycRequired}
        kycBlocker={kycBlocker}
        profileLoadState={profileLoadState}
        technicianProfile={technicianProfile}
        hasAcceptedQuote={hasAcceptedQuote}
        scheduledValue={scheduledValue}
        onScheduledValueChange={setScheduledValue}
        onAccept={handleAccept}
        onSchedule={handleSchedule}
        onStart={() => handleStatusChange('IN_PROGRESS')}
        onFinish={() => setConfirmFinish(true)}
        onRetryProfile={() => setProfileReloadKey((key) => key + 1)}
      />

      {/* ═══ ONGLETS ═══════════════════════════════════════════════════ */}
      <Tabs
        items={TAB_ITEMS}
        value={visibleTab}
        onChange={(id) => setActiveTab(id as MissionTab)}
        variant="segmented"
        label="Sections de la mission"
      />

      {/* ═══ ONGLET « APERÇU » ═════════════════════════════════════════ */}
      {visibleTab === TAB_OVERVIEW ? (
        <div role="tabpanel" aria-label="Aperçu de la mission" className="space-y-4">
          {deviceLabel ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <Icon name="briefcase" size="sm" className="shrink-0 text-primary" />
              <p className="text-sm text-foreground">{deviceLabel}</p>
            </div>
          ) : null}

          {/* Parcours « Autre appareil » — indice structuré affiché en
            libellé (texte libre historique en repli). Information client,
            jamais un diagnostic ; ne remplace pas le diagnostic libre. */}
          {!deviceLabel && (demande.equipmentFamily || demande.equipmentType) ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <Icon name="briefcase" size="sm" className="shrink-0 text-primary" />
              <p className="text-sm text-foreground">
                Appareil :{' '}
                {demande.equipmentFamily
                  ? familyLabels[demande.equipmentFamily] ?? demande.equipmentFamily
                  : demande.equipmentType}{' '}
                {familyLabelsFailed && demande.equipmentFamily && !familyLabels[demande.equipmentFamily] ? (
                  <Badge variant="neutral" className="mr-1">Libellé non disponible</Badge>
                ) : null}
                <span className="text-xs text-muted-foreground">(déclaré par le client)</span>
              </p>
            </div>
          ) : null}

          <Card>
            <CardContent className="pt-4 sm:pt-5">
              <MissionInfo
                description={demande.description}
                city={demande.city}
                requestedMode={demande.requestedMode}
                requestedAt={demande.requestedAt}
                createdAt={demande.createdAt}
                scheduledAt={demande.scheduledAt}
              />
            </CardContent>
          </Card>

          {/* Dépôt multimédia — visible immédiatement dès l'assignation
            (liaison en transaction à la création, URLs signées lazy). */}
          {showMedias ? (
            <Card>
              <CardContent className="pt-4 sm:pt-5">
                <DemandeMediaSection
                  demandeId={demande.id}
                  medias={demande.medias}
                  fetchUrl={(demandeId, mediaId) => getTechnicianDemandeMediaFileUrl(demandeId, mediaId)}
                />
              </CardContent>
            </Card>
          ) : null}

          {demande.status !== 'CANCELED' ? (
            <Card>
              <CardContent className="space-y-3 pt-4 sm:pt-5">
                <SectionHeader title="Avancement" />
                <DemandeProgress status={demande.status} />
              </CardContent>
            </Card>
          ) : null}

          {demande.technicianId ? (
            <TravelSection demande={demande} onChanged={(d) => setDemande(d)} />
          ) : null}

          {/* GPS V4 — carte de la mission (lieu + position personnelle).
              L'actualisation reste manuelle via la section Déplacement. */}
          {demande.technicianId && hasInterventionCoords ? (
            <Card>
              <CardContent className="space-y-3 pt-4 sm:pt-5">
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
              </CardContent>
            </Card>
          ) : null}

          {demande.client ? (
            <Card>
              <CardContent className="space-y-3 pt-4 sm:pt-5">
                <SectionHeader title="Client" icon="user" />
                <div className="flex items-center gap-3">
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
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {/* ═══ ONGLET « DIAGNOSTIC & DEVIS » ══════════════════════════════
       * Ce que le technicien produit : diagnostic libre, diagnostic publié,
       * proposition tarifaire. */}
      {visibleTab === TAB_DIAGNOSTIC ? (
        <div role="tabpanel" aria-label="Diagnostic et devis" className="space-y-4">
          {/* IA-3 — diagnostic libre + devis en un envoi (sans catalogue) */}
          {canChooseDiagnostic && canProposeManualQuote ? (
            <FreeDiagnosticSection
              demandeId={demande.id}
              onDone={() => setRefreshKey((key) => key + 1)}
            />
          ) : null}

          {showDiagnostic ? (
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
          ) : null}

          {showQuote ? (
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
                        {/* Commission affichée APRÈS envoi : ce sont les montants
                          * renvoyés par le backend (aucun recalcul frontend). Le
                          * repli `previewTechnicianQuote` ne sert que si un ancien
                          * devis, émis avant le chantier, n'expose pas encore le
                          * champ — même formule, donc même résultat. */}
                        <div className="my-1 h-px bg-border" />
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">{TECHNICIAN_FEE_LABEL}</span>
                          <span className="font-medium text-muted-foreground">
                            −{formatPrice(
                              latestQuote.commission ??
                                previewTechnicianQuote(latestQuote.repair ?? latestQuote.amount).commission,
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Vous recevrez</span>
                          <span className="font-semibold text-success-ink">
                            {formatPrice(
                              latestQuote.netTechnician ??
                                previewTechnicianQuote(latestQuote.repair ?? latestQuote.amount).net,
                            )}
                          </span>
                        </div>
                        {/* OPTION A : le montant ci-dessus est votre net — c'est
                          * exactement ce qui sera versé sur votre Mobile Money au
                          * moment du retrait. Aucun montant de frais n'est
                          * exposé : il est pris en charge par Relio. */}
                        <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                          <Icon name="info" size="sm" className="mt-0.5 shrink-0" />
                          <span>{relioAbsorbsTransferFeesNote('mission')}</span>
                        </p>
                      </div>
                    ) : null}
                    {demande.status === 'CONFIRMED' && latestQuote ? (
                      <Alert variant="info" dense icon="info">
                        {TECHNICIAN_FEE_LABEL} est prélevée sur le montant de votre devis. Vos 2 000 FCFA
                        de déplacement vous sont intégralement reversés, en plus du devis. Le détail de
                        votre gain net apparaît dans l&apos;onglet Revenus.
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
                  <QuoteForm
                    amountValue={amountValue}
                    quoteDescription={quoteDescription}
                    onAmountChange={setAmountValue}
                    onDescriptionChange={setQuoteDescription}
                    onSubmit={handleCreateQuote}
                    submitting={actionBusy === 'QUOTE'}
                    canSubmitQuote={canSubmitQuote}
                  />
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {/* ═══ ONGLET « DISCUSSION » ═══════════════════════════════════════
       * Plein largeur : la conversation est un contenu de mission, pas une
         carte d'appoint. */}
      {visibleTab === TAB_DISCUSSION ? (
        <div role="tabpanel" aria-label="Discussion avec le client" className="space-y-3">
          {baseCanDiscuss && (catalogFlow ? negotiationUnlocked : true) ? (
            <Card>
              <CardContent className="pt-4 sm:pt-5">
                <ConversationSection
                  demandeId={demande.id}
                  canSend={canDiscuss}
                  peerName={demande.client ? fullName(demande.client.firstName, demande.client.lastName) : null}
                />
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground">
              La discussion est fermée sur cette mission.
            </p>
          )}
        </div>
      ) : null}

      {/* ═══ ONGLET « DÉTAILS » ═══ (voir <DetailsTab />) ═════════════ */}
      {visibleTab === TAB_DETAILS ? (
        <DetailsTab
          demande={demande}
          dispute={dispute}
          eventsCount={events.length}
          timelineFailed={timelineFailed}
          lastActivityLabel={lastActivityLabel}
          onRetryTimeline={() => setRefreshKey((key) => key + 1)}
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
        description="L’intervention passera en attente de confirmation du client. Cette action déclenche le calcul du règlement (brut, commission Relio 500 FCFA + 4 %, net)."
        confirmLabel="Marquer comme terminée"
      />
    </div>
  );
}

/* ── Formulaire de proposition tarifaire (extrait pour lisibilité) ──────
 * Ce bloc était de 80 lignes au milieu d'une card de 500 : il est isolé ici
 * sans changer une ligne de sa logique ni de ses identifiants. Le test
 * `technician-quote.test.ts` (aperçu, seuil, bouton bloqué) continue de lire
 * `quoteAmountError`, `previewTechnicianQuote`, `isQuoteAmountAllowed` et
 * `quoteAmount-preview` dans la page : ces appels sont tous dans ce composant,
 * qui vit dans le MÊME fichier. */
function QuoteForm({
  amountValue,
  quoteDescription,
  onAmountChange,
  onDescriptionChange,
  onSubmit,
  submitting,
  canSubmitQuote,
}: {
  amountValue: string;
  quoteDescription: string;
  onAmountChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  canSubmitQuote: boolean;
}) {
  /* Chantier 4-FONDATIONS-A — saisie du devis : seuil de 5 000 FCFA, aperçu
   * de la commission en direct, bouton bloqué tant que le devis est hors
   * bornes. Source unique : `@/lib/technician-quote` (le backend revalide).
   *
   * ⚠️ AUCUN HOOK ICI — et c'est délibéré. Ce composant est rendu APRÈS les
   * returns anticipés du composant parent (`if (loading)`, `if (error &&
   * !demande)`, `if (!demande) return null`). Appeler un hook React ici
   * ferait varier le nombre de hooks du PARENT entre deux rendus (render 1
   * sur skeleton = 26, render 2 avec données = 27) : React lève alors
   * « Rendered more hooks than during the previous render » et toute la page
   * tombe sur `src/app/error.tsx`.
   *
   * Régression introduite par 4-A (commit 7dc1818) via un `useMemo` sur ce
   * bloc, puis supprimée : `previewTechnicianQuote` est un calcul trivial sur
   * un nombre, la mémoïsation n'apportait rien. Si ce bloc devient coûteux, la
   * correction est de le remonter AVANT le premier return — jamais d'ajouter
   * un hook ici. Verrouillé par `src/lib/technician-quote.test.ts`. */
  const parsedQuote = quoteAmountError(amountValue);
  const quoteAmountMessage = parsedQuote.error;
  const quotePreview =
    parsedQuote.amount === null ? null : previewTechnicianQuote(parsedQuote.amount);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-3">
      <Field
        htmlFor="quoteAmount"
        label="Montant (FCFA)"
        hint={`Minimum ${MIN_QUOTE_AMOUNT_XAF.toLocaleString('fr-FR').replace(/\s/g, ' ')} FCFA`}
        error={quoteAmountMessage}
      >
        <Input
          id="quoteAmount"
          type="number"
          min={MIN_QUOTE_AMOUNT_XAF}
          step={500}
          value={amountValue}
          onChange={(event) => onAmountChange(event.target.value)}
          placeholder="Ex. : 15000"
          aria-describedby="quoteAmount-preview"
        />
      </Field>

      {/* Aperçu AVANT envoi : à ce stade aucun devis n'existe en base, l'aperçu
          ne peut donc pas venir de l'API. Après envoi, les montants affichés
          dans la card sont ceux du backend. */}
      {quotePreview ? (
        <div
          id="quoteAmount-preview"
          className="space-y-1 rounded-lg border border-border bg-muted/20 p-3 text-sm tabular-nums"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Votre devis</span>
            <span className="font-medium">{formatFCFA(quotePreview.quote)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Déplacement (intégralement yours)</span>
            <span className="font-medium">{formatFCFA(quotePreview.travel)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{TECHNICIAN_FEE_LABEL}</span>
            <span className="font-medium text-muted-foreground">
              −{formatFCFA(quotePreview.commission)}
            </span>
          </div>
          <div className="my-1 h-px bg-border" />
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold">Vous recevez</span>
            <span className="font-semibold text-success-ink">
              {formatFCFA(quotePreview.net)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Le client paiera {formatFCFA(quotePreview.clientPays)}.
          </p>
          {/* OPTION A : le net ci-dessus est bien ce que vous recevrez, frais
            * de transfert Mobile Money compris dans la prise en charge Relio. */}
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Icon name="info" size="sm" className="mt-0.5 shrink-0" />
            <span>{relioAbsorbsTransferFeesNote('apercu-devis')}</span>
          </p>
        </div>
      ) : null}

      <Field htmlFor="quoteDescription" label="Description">
        <Input
          id="quoteDescription"
          value={quoteDescription}
          onChange={(event) => onDescriptionChange(event.target.value)}
          maxLength={1000}
          placeholder="Ex. : remplacement du connecteur de charge + main-d'œuvre."
        />
      </Field>
      <Button onClick={onSubmit} isLoading={submitting} disabled={!canSubmitQuote} className="w-full">
        Proposer
      </Button>
    </div>
  );
}
/* ── HEADER PERMANENT (extrait, chantier 6B) ────────────────────────────
 *
 * Ce bloc faisait 141 lignes à lui seul, au milieu du composant principal.
 * Il porte les 4 points de contrôle KYC de la page :
 *
* 1. `kycRequired`, calculé par le PARENT (le test `technician-kyc.test.ts`
 *      lit la formule complète et `{canAccept && kycRequired ?` dans ce
 *      fichier) ;
 *   2. le bandeau `kycBlocker` + le bouton « Accepter » VISIBLE mais
 *      DÉSACTIVÉ (le même test lit `<Button disabled className="w-full"
 *      size="lg">Accepter la demande`) ;
 *   3. l'écran d'erreur 404 avec message métier, et le squelette
 *      intermédiaire — tous deux restent dans le composant PARENT, car ils
 *      sont des returns anticipés et doivent l'être au plus haut niveau.
 *
 * Aucune logique ici : uniquement de l'affichage des props et le rendu de la
 * bannière. */
function TechnicianHeader({
  demande,
  actionError,
  actionBusy,
  canAccept,
  kycRequired,
  kycBlocker,
  profileLoadState,
  technicianProfile,
  hasAcceptedQuote,
  scheduledValue,
  onScheduledValueChange,
  onAccept,
  onSchedule,
  onStart,
  onFinish,
  onRetryProfile,
}: {
  demande: TechnicianDemande;
  actionError: string | null;
  actionBusy: string | null;
  canAccept: boolean;
  kycRequired: boolean;
  kycBlocker: KycAcceptanceBanner;
  profileLoadState: 'loading' | 'loaded' | 'error';
  technicianProfile: { kycStatus: string; kycRejectionReason?: string | null } | null;
  hasAcceptedQuote: boolean;
  scheduledValue: string;
  onScheduledValueChange: (value: string) => void;
  onAccept: () => void;
  onSchedule: () => void;
  onStart: () => void;
  onFinish: () => void;
  onRetryProfile: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-lg font-semibold text-primary">{demande.reference}</span>
          <DemandeStatusBadge status={demande.status} context="technician" />
        </div>
        <CardTitle className="text-base">{demande.categoryLabel}</CardTitle>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {demande.city ? (
            <span className="flex items-center gap-1">
              <Icon name="pin" size="3.5" />
              {demande.city}
            </span>
          ) : null}
          {demande.client ? (
            <span className="flex items-center gap-1">
              <Icon name="user" size="3.5" />
              {fullName(demande.client.firstName, demande.client.lastName)}
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {actionError ? <Alert variant="error">{actionError}</Alert> : null}

        {/* ── Point de contrôle KYC n°2 : bandeau + bouton désactivé.
             Le bandeau est ROUGE : l'acceptation est réellement bloquée,
             ce n'est pas une simple recommandation. Le motif de refus
             éventuel est repris ici — c'est lui qui dit au technicien
             quoi corriger. */}
        {canAccept && kycRequired ? (
          <div className="space-y-3">
            {/* 6C-1 — le statut est INCONNU (chargement ou échec réseau) :
                le bandeau métier ci-dessous dirait « vérifiez votre identité »
                alors que le problème est technique. Message + Réessayer. */}
            {profileLoadState === 'error' ? (
              <Alert
                variant="error"
                title="Impossible de vérifier votre statut d’identité"
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onRetryProfile}
                  >
                    Réessayer
                  </Button>
                }
              >
                <p>
                  Nous n’avons pas pu joindre le service de vérification. L’acceptation reste
                  bloquée tant que votre statut n’est pas connu — ce n’est pas un refus de
                  votre dossier.
                </p>
              </Alert>
            ) : (
              <>
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
              </>
            )}
          </div>
        ) : null}

        {/* ── Action principale du header, une seule à la fois. */}
        {canAccept && !kycRequired ? (
          <Button onClick={onAccept} isLoading={actionBusy === 'ACCEPTED'} className="w-full" size="lg">
            Accepter la demande
          </Button>
        ) : null}

        {demande.status === 'ACCEPTED' && hasAcceptedQuote ? (
          <div className="space-y-3">
            <Field htmlFor="scheduledAt" label="Date et heure de l'intervention">
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledValue}
                onChange={(event) => onScheduledValueChange(event.target.value)}
              />
            </Field>
            <Button
              onClick={onSchedule}
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
          <Button onClick={onStart} isLoading={actionBusy === 'IN_PROGRESS'} className="w-full" size="lg">
            Démarrer l&apos;intervention
          </Button>
        ) : null}

        {demande.status === 'IN_PROGRESS' ? (
          <Button onClick={onFinish} isLoading={actionBusy === 'COMPLETED'} className="w-full" size="lg">
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
  );
}

/* ── ONGLET « DÉTAILS » (extrait, chantier 6B) ───────────────────────────
 *
 * Le bloc était de 58 lignes dans le composant principal. Il regroupe ce qui
 * est secondaire mais nécessaire : litige en lecture seule, opt-in push,
 * lien vers la chronologie, récapitulatif complet et avis sur le client.
 *
 * Le litige reste STRICTEMENT en lecture côté technicien : le client est le
 * seul à pouvoir le contester, l'admin le seul à pouvoir le trancher. Cette
 * page n'appelle donc QUE l'endpoint de lecture (invariant verrouillé par
 * `dispute-status.test.ts`). */
function DetailsTab({
  demande,
  dispute,
  eventsCount,
  timelineFailed,
  lastActivityLabel,
  onRetryTimeline,
}: {
  demande: TechnicianDemande;
  dispute: DemandeDispute | null;
  eventsCount: number;
  timelineFailed: boolean;
  lastActivityLabel: string;
  onRetryTimeline: () => void;
}) {
  return (
    <div role="tabpanel" aria-label="Détails de la mission" className="space-y-4">
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

      {/* Proposition contextuelle : suivre cette mission acceptée même
          app fermée (carte inline, jamais de popup). */}
      {demande.status === 'ACCEPTED' ? <PushNotificationCard compact /> : null}

      {timelineFailed ? (
        <div className="rounded-xl border border-border bg-card p-3">
          <EmptyState
            icon={<Icon name="clock" size="md" />}
            title="Impossible de charger l’historique"
            description="La chronologie de la mission n’a pas pu être récupérée. Les autres informations de cet onglet restent valides."
            action={
              <Button variant="secondary" size="sm" onClick={onRetryTimeline}>
                Réessayer
              </Button>
            }
            className="py-6"
          />
        </div>
      ) : eventsCount > 0 ? (
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

      {['ACCEPTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CONFIRMED'].includes(demande.status) ? (
        <MissionSummaryCard demandeId={demande.id} title="Récapitulatif de la mission" />
      ) : null}

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
