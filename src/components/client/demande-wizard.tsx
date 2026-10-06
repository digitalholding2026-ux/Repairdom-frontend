'use client';

import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Icon, ICON_NAMES, type IconName } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { VoiceRecorder, VOICE_MAX_SECONDS } from '@/components/client/voice-recorder';
import { cn } from '@/lib/cn';
import { formatFileSize } from '@/lib/format';
import { formatRequestedTiming, type RequestTimingMode } from '@/lib/request-timing';
import {
  createDemande,
  uploadDemandeMedia,
  deleteUploadedDemandeMedia,
  createDemandeDraft,
  updateDemandeDraft,
  getDemandeDraft,
  convertDemandeDraft,
  type CreateDemandeDraftPayload,
} from '@/lib/api/request-service';
import { useAuth } from '@/components/auth/auth-provider';
import {
  clearDemandeDraftToken,
  readDemandeDraftToken,
  writeDemandeDraftToken,
} from '@/lib/demande-draft-storage';
import {
  canCreateDraft,
  diffDraftPayload,
  draftToWizardFields,
  toDraftPayload,
} from '@/lib/demande-draft-sync';
import { DemandeAuthModal } from '@/components/client/demande-auth-modal';
import { ApiError, type AuthUser } from '@/lib/api/auth-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';
import {
  formatTravelAccuracyShort,
  getCurrentTravelPosition,
} from '@/lib/travel-location';
import {
  listCatalogDomains,
  listCatalogBrands,
  listEquipmentFamilies,
  type CatalogDomainLite,
  type CatalogBrandLite,
  type EquipmentFamilyLite,
} from '@/lib/api/catalog-service';
import { getMe } from '@/lib/api/auth-service';

const STEPS = ['Votre appareil', 'Votre panne', 'Où et quand ?', 'Vérifiez et envoyez'];

const OTHER_DOMAIN = '__other__';

/* Dépôt multimédia — limites miroir backend (5 fichiers, 25 Mo chacun,
 * IMAGE/VIDEO/AUDIO). Le vocal est en outre plafonné à 3 min côté
 * enregistreur. Les octets sont uploadés à l'envoi AVANT création de la
 * Demande, puis liés en transaction (accès technicien immédiat). */
const MAX_MEDIAS = 5;
const MAX_MEDIA_BYTES = 25 * 1024 * 1024;

export type ConversionOutcome = 'done' | 'media-failed' | 'unauthorized' | 'error';

type WizardMediaKind = 'IMAGE' | 'VIDEO' | 'AUDIO';

interface WizardMedia {
  key: string;
  kind: WizardMediaKind;
  name: string;
  mimeType: string;
  sizeBytes: number;
  /** Fichier réel (uploadé à l'envoi, avant création de la Demande). */
  file: File;
  preview: string | null;
  /** Chemin retourné par l'upload (lié en transaction à la création). */
  storagePath?: string;
}

const CATEGORY_ICONS: Record<string, IconName> = {
  electricite: 'zap',
  plomberie: 'droplet',
  climatisation: 'thermometer',
  electromenager: 'settings',
  serrurerie: 'shield-check',
  informatique: 'cpu',
  autre: 'plus',
};

function domainIcon(domain: CatalogDomainLite): IconName {
  if (domain.icon && (ICON_NAMES as readonly string[]).includes(domain.icon)) {
    return domain.icon as IconName;
  }
  if (domain.category && CATEGORY_ICONS[domain.category]) {
    return CATEGORY_ICONS[domain.category];
  }
  return 'wrench';
}

function nowLocalValue(): string {
  const date = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/* Chantier D2 — inverse de `nowLocalValue` : le brouillon mémorise l'ISO du
 * backend, le champ `datetime-local` attend une valeur LOCALE (sans fuseau).
 * On passe par Date pour ne pas décaler l'heure d'un décalage horaire. */
function toLocalDatetimeValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function DemandeWizard() {
  const router = useRouter();

  /* ── Chantier D2 — mode du wizard ──────────────────────────────────
   * Un SEUL composant sert désormais les deux parcours :
   *  - anonyme (`/demande`) : sauvegarde progressive vers le brouillon ;
   *  - authentifié (CLIENT) : comportement historique inchangé.
   *
   * `isAnonymousMode` est faux TANT QUE `authLoading` est vrai : sans cette
   * garde, un client déjà connecté verrait le bandeau « votre progression est
   * sauvegardée » et tirerait un PATCH inutile avant que `GET /auth/me` ait
   * répondu. */
  const { authenticated, loading: authLoading, refresh } = useAuth();
  const isAnonymousMode = !authLoading && !authenticated;

  const [step, setStep] = useState(0);
  const [categoryId, setCategoryId] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [requestedMode, setRequestedMode] = useState<RequestTimingMode>('ASAP');
  const [requestedAt, setRequestedAt] = useState('');
  const [medias, setMedias] = useState<WizardMedia[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);
  /* Remonte l'enregistreur après validation (le vocal validé vit dans la
   * grille ci-dessous, supprimable/retéléchargeable comme les autres). */
  const [voiceKey, setVoiceKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* Progression d'envoi des fichiers (upload AVANT création). */
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  /* GPS V1 — position ponctuelle opt-in (géolocalisation navigateur, un seul
   * relevé, jamais de suivi). Le formulaire reste utilisable sans GPS et
   * l'adresse texte n'est jamais remplacée ni déduite. */
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy: number | null } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Appareil (catalogue) — source de vérité admin.
  /* Parcours « Autre appareil » — indice structuré (code de famille choisi
   * dans la liste administrable). Jamais de texte libre côté client. */
  const [families, setFamilies] = useState<EquipmentFamilyLite[]>([]);
  const [equipmentFamily, setEquipmentFamily] = useState('');
  /* Description libre du problème (langage naturel, 10 caractères min) :
   * exigée à l'étape panne, les photos/vidéos restant facultatives. */
  const DESCRIPTION_MIN_LENGTH = 10;
  const [description, setDescription] = useState('');
  const [domains, setDomains] = useState<CatalogDomainLite[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [domainId, setDomainId] = useState('');
  const [domainName, setDomainName] = useState('');
  const [brandId, setBrandId] = useState('');
  const [brands, setBrands] = useState<CatalogBrandLite[]>([]);

  /* ── Chantier D2 — état du brouillon + de la modale d'authentification ──
   * `draftToken` est null tant qu'aucun brouillon n'existe : on ne crée
   * JAMAIS de brouillon vide (le backend refuse `description` < 10 car. et
   * `city` vide, et un brouillon vide ne sert à rien). Le premier brouillon
   * naît donc dès que la saisie atteint le minimum DTO. */
  const [draftToken, setDraftToken] = useState<string | null>(null);
  /* Dernier instantané synchronisé — sert au diff PATCH (évite un aller-retour
   * toutes les 800 ms quand rien n'a changé) et à ne pas re-patcher les
   * champs juste restaurés. */
  const draftSyncedRef = useRef<Partial<CreateDemandeDraftPayload> | null>(null);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  /* Erreur de l'étape POST-auth (upload / conversion) : affichée DANS la
   * modale, qui ne se ferme que sur succès. */
  const [stageError, setStageError] = useState<string | null>(null);
  /* Médias refusés par le serveur : l'utilisateur choisit Réessayer ou
   * Continuer sans. */
  const [failedMedias, setFailedMedias] = useState<WizardMedia[]>([]);
  /* Passe à `true` pendant l'upload + la conversion, pour que le bouton de la
   * modale affiche la progression au lieu de « Envoyer ». */
  const [converting, setConverting] = useState(false);
  /* Chantier D2.5 — 401 sur la conversion : la modale propose de se reconnecter. */
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [signInRequestId, setSignInRequestId] = useState(0);

  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    /* Chantier FIX — ces deux échecs étaient totalement MUETS. En production,
     * un 401 sur `/catalog/*` produisait exactement la même image qu'une panne
     * réseau (« Catalogue indisponible »), sans la moindre trace exploitable :
     * impossible de distinguer « catalogue indisponible » de « visitor non
     * authentifié ». On journalise le STATUT HTTP seul — aucun secret, aucun
     * identifiant. Le comportement VISIBLE reste strictement inchangé. */
    listCatalogDomains()
      .then((list) => {
        if (active) setDomains(list);
      })
      .catch((err) => {
        console.warn('[demande] catalogue des domaines indisponible', {
          status: err instanceof ApiError ? err.status : 'network',
        });
        if (active) setDomains([]);
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });
    listEquipmentFamilies()
      .then((list) => {
        if (active) setFamilies(list);
      })
      .catch((err) => {
        console.warn('[demande] familles d\'appareils indisponibles', {
          status: err instanceof ApiError ? err.status : 'network',
        });
      });
    return () => {
      active = false;
    };
  }, []);

  /* Préremplissage depuis le profil (ville, téléphone) : uniquement si le
   * champ est encore vide — ne JAMAIS écraser une saisie manuelle. Échec
   * silencieux : le formulaire reste utilisable sans profil.
   *
   * Chantier D2 : réservé au mode AUTHENTIFIÉ. Un visiteur anonyme n'a pas de
   * profil à lire, et l'appel partirait en 401 sans rien apporter. */
  useEffect(() => {
    if (authLoading || !authenticated) return;
    let active = true;
    getMe()
      .then((me) => {
        if (!active) return;
        if (me.city) setCity((prev) => (prev.trim() !== '' ? prev : me.city ?? ''));
        if (me.phone) setContactPhone((prev) => (prev.trim() !== '' ? prev : me.phone ?? ''));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [authLoading, authenticated]);

  const minRequestedAt = useMemo(() => nowLocalValue(), []);
  const requestedAtIso = useMemo(
    () => (requestedMode === 'SCHEDULED' && requestedAt ? new Date(requestedAt).toISOString() : null),
    [requestedMode, requestedAt],
  );

  const selectedDeviceLabel = useMemo(() => {
    const parts: string[] = [];
    if (domainName) parts.push(domainName);
    const brand = brands.find((b) => b.id === brandId);
    if (brand) parts.push(brand.name);
    return parts.join(' — ');
  }, [domainName, brands, brandId]);

  /* ── Chantier D2 — instantané des champs pour la synchronisation ────── */
  const draftFields = useMemo(
    () => ({
      categoryId,
      domainId,
      brandId,
      equipmentFamily,
      description,
      city,
      neighborhood,
      address,
      landmark,
      contactPhone,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      requestedMode,
      requestedAtIso,
      isOtherDomain: domainId === OTHER_DOMAIN,
    }),
    [
      categoryId,
      domainId,
      brandId,
      equipmentFamily,
      description,
      city,
      neighborhood,
      address,
      landmark,
      contactPhone,
      coords,
      requestedMode,
      requestedAtIso,
    ],
  );

  /* ── Chantier D2 — reprise d'un brouillon (refresh / onglet fermé) ──────
   *
   * Un brouillon existe forcément si et seulement si un token est mémorisé :
   * on n'en crée jamais de vide. La lecture est faite UNE fois au montage du
   * wizard ; `draftToken` sert ensuite de déclencheur à la synchronisation.
   *
   * Échec : on oublie le token et on repart d'une page vierge. Mieux vaut une
   * saisie recommencée qu'une page à moitié restaurée qui ment sur l'état du
   * backend. Le `catch` ne loggue JAMAIS le token (secret). */
  useEffect(() => {
    if (!isAnonymousMode) return;
    const token = readDemandeDraftToken();
    if (!token) return;
    let active = true;
    setDraftToken(token);
    getDemandeDraft(token)
      .then((draft) => {
        if (!active) return;
        const fields = draftToWizardFields(draft);
        setCategoryId(fields.categoryId ?? 'autre');
        /* `domainName` n'est pas stocké côté brouillon : il est reconstruit à
         * partir du catalogue chargé par l'effet #1, sinon le récapitulatif de
         * l'étape 4 afficherait « Appareil » vide. */
        if (fields.domainId) {
          const domain = domains.find((d) => d.id === fields.domainId);
          if (domain) setDomainName(domain.name);
        }
        setDomainId(fields.domainId ?? '');
        setBrandId(fields.brandId ?? '');
        setEquipmentFamily(fields.equipmentFamily ?? '');
        setDescription(fields.description ?? '');
        setCity(fields.city ?? '');
        setNeighborhood(fields.neighborhood ?? '');
        setAddress(fields.address ?? '');
        setLandmark(fields.landmark ?? '');
        setContactPhone(fields.contactPhone ?? '');
        /* Le brouillon ne mémorise que lat/lon (pas la précision du relevé) :
         * on restitue un `coords` minimal — `accuracy: null` affiche
         * « Position enregistrée pour cette demande. » sans afficher de
         * précision qui n'a pas été relevée. */
        if (typeof fields.latitude === 'number' && typeof fields.longitude === 'number') {
          setCoords({
            latitude: fields.latitude,
            longitude: fields.longitude,
            accuracy: null,
          });
        }
        setRequestedMode(fields.requestedMode ?? 'ASAP');
        /* Le brouillon mémorise l'ISO ; le champ attend le format local du
         * `datetime-local`. `requestedMode !== SCHEDULED` ⇒ on laisse la date
         * telle quelle, l'ISO n'étant de toute façon pas rejoué par
         * `requestedAtIso` dans ce mode. */
        setRequestedAt('');
        if (fields.requestedAtIso && fields.requestedMode === 'SCHEDULED') {
          setRequestedAt(toLocalDatetimeValue(fields.requestedAtIso));
        }
        /* Marqueur synchronisé : la restauration ne doit pas déclencher un
         * PATCH de ce qui vient d'être relu. */
        draftSyncedRef.current = toDraftPayload(fields as never);
        setDraftNotice(null);
      })
      .catch(() => {
        if (!active) return;
        clearDemandeDraftToken();
        setDraftToken(null);
        draftSyncedRef.current = null;
      });
    return () => {
      active = false;
    };
    /* `domains` est volontairement hors dépendances : il se remplit après ce
     * montage. Le rattacher rejouerait la restauration et écraserait une
     * saisie entre-temps. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnonymousMode]);

  /* ── Chantier D2 — synchronisation progressive (debounce 800 ms) ──────
   *
   * Uniquement en mode anonyme ET seulement si un brouillon existe déjà (ou
   * si la saisie vient d'atteindre le minimum que le backend accepte).
   *
   * Échecs JAMAIS bloquants : la saisie doit rester la source de vérité côté
   * client. Un PATCH raté est journalisé SANS le token, et le prochain tick
   * réessaiera (le diff repart de l'instantané successfully synchronisé, donc
   * le champ-modified est renvoyé). */
  useEffect(() => {
    if (!isAnonymousMode || !draftToken) return;
    const timer = window.setTimeout(() => {
      const payload = toDraftPayload(draftFields);
      const changed = diffDraftPayload(draftSyncedRef.current, payload);
      if (Object.keys(changed).length === 0) return;
      updateDemandeDraft(draftToken, changed)
        .then(() => {
          draftSyncedRef.current = payload;
          setDraftNotice(null);
        })
        .catch((err) => {
          /* 410 Gone : le brouillon a expiré (7 jours) ou a été purgé. On
           * l'oublie ; le prochain tick recréera un brouillon neuf puisque
           * `draftToken` repassera à null. */
          if (err instanceof ApiError && err.status === 410) {
            clearDemandeDraftToken();
            setDraftToken(null);
            draftSyncedRef.current = null;
            setDraftNotice('Votre brouillon a expiré. Une nouvelle sauvegarde est en cours.');
            return;
          }
          /* Journalisation VOLONTAIREMENT sans le token : il est un secret. */
          console.warn('[demande] sauvegarde du brouillon impossible', {
            status: err instanceof ApiError ? err.status : 'network',
          });
        });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [isAnonymousMode, draftToken, draftFields]);

  /* ── Chantier D2 — PREMIER brouillon ─────────────────────────────────
   *
   * Tant qu'aucun token n'existe, on n'appelle PAS `POST` : le backend exige
   * `description` (10 car. min) + `city` non vide, et un brouillon créé trop
   * tôt partirait en 400 à chaque frappe. Le POST part donc au premier instant
   * où la saisie satisfait le minimum — et emporte l'INTÉGRALITÉ des champs,
   * ce qui évite un PATCH immédiatement après. */
  useEffect(() => {
    if (!isAnonymousMode || draftToken) return;
    if (!canCreateDraft(draftFields)) return;
    let active = true;
    createDemandeDraft(toDraftPayload(draftFields))
      .then((created) => {
        if (!active) return;
        writeDemandeDraftToken(created.token);
        setDraftToken(created.token);
        draftSyncedRef.current = toDraftPayload(draftFields);
      })
      .catch((err) => {
        /* Silencieux côté UI au-delà d'une trace sans token : le wizard doit
         * rester utilisable même si la sauvegarde ne fonctionne pas (backend
         * indisponible, quota, etc.). La demande partira par le flux direct
         * après authentification. */
        console.warn('[demande] création du brouillon impossible', {
          status: err instanceof ApiError ? err.status : 'network',
        });
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnonymousMode, draftToken, canCreateDraft(draftFields), draftFields]);

  const locationLabel = useMemo(
    () => [city.trim(), neighborhood.trim(), address.trim(), landmark.trim()].filter(Boolean).join(' — '),
    [city, neighborhood, address, landmark],
  );

  const mediaSummary = useMemo(() => {
    if (medias.length === 0) return '';
    const counts = { AUDIO: 0, VIDEO: 0, IMAGE: 0 } as Record<WizardMediaKind, number>;
    for (const media of medias) counts[media.kind] += 1;
    const parts: string[] = [];
    if (counts.AUDIO > 0) parts.push(`${counts.AUDIO} vocal${counts.AUDIO !== 1 ? 'aux' : ''}`);
    if (counts.VIDEO > 0) parts.push(`${counts.VIDEO} vidéo${counts.VIDEO !== 1 ? 's' : ''}`);
    if (counts.IMAGE > 0) parts.push(`${counts.IMAGE} photo${counts.IMAGE !== 1 ? 's' : ''}`);
    return parts.join(' + ');
  }, [medias]);

  const canContinue = useMemo(() => {
    // Appareil : catégorie puis marque réelle obligatoire (plus d'option
    // « toutes les marques ») ; « Autre » exige un indice structuré.
    if (step === 0) {
      if (domainId === '') return false;
      if (domainId === OTHER_DOMAIN) return equipmentFamily.trim() !== '';
      return brandId !== '';
    }
    // Panne : description libre exigée (photos/vidéos facultatives).
    if (step === 1) return description.trim().length >= DESCRIPTION_MIN_LENGTH;
    if (step === 2) return city.trim() !== '' && (requestedMode === 'ASAP' || requestedAt !== '');
    return true;
  }, [step, domainId, equipmentFamily, brandId, description, city, requestedMode, requestedAt]);

  const handleDomainChange = (id: string) => {
    setDomainId(id);
    setBrandId('');
    setBrands([]);
    // L'indice ne s'applique qu'à « Autre ».
    setEquipmentFamily('');
    if (id === OTHER_DOMAIN) {
      setDomainName('');
      setCategoryId('autre');
      return;
    }
    const domain = domains.find((d) => d.id === id);
    setDomainName(domain?.name ?? '');
    setCategoryId(domain?.category ?? 'autre');
    if (id) {
      listCatalogBrands(id)
        .then(setBrands)
        .catch(() => setBrands([]));
    }
  };

  const handleBrandChange = (id: string) => {
    setBrandId(id);
  };

  const mediasRef = useRef<WizardMedia[]>([]);
  mediasRef.current = medias;

  // Libère les URL d’aperçu à la fermeture du wizard.
  useEffect(
    () => () => {
      mediasRef.current.forEach((media) => {
        if (media.preview) URL.revokeObjectURL(media.preview);
      });
    },
    [],
  );

  const mediaRoom = MAX_MEDIAS - medias.length;

  const pushMedias = (incoming: Array<{ kind: WizardMediaKind; name: string; mimeType: string; sizeBytes: number; file: File }>) => {
    setMediaError(null);
    if (mediaRoom <= 0) {
      setMediaError(`Maximum ${MAX_MEDIAS} fichiers par demande (vocal, vidéo et photos confondus).`);
      return;
    }
    const sliced = incoming.slice(0, mediaRoom);
    if (incoming.length > mediaRoom) {
      setMediaError(
        `Maximum ${MAX_MEDIAS} fichiers par demande — seuls les ${mediaRoom} premiers ont été ajoutés.`,
      );
    }
    const next: WizardMedia[] = sliced.map((item, index) => ({
      ...item,
      key: `${item.name}-${item.sizeBytes}-${Date.now()}-${index}`,
      // Aperçu local (image, vidéo, relecture vocale) — révoqué à la
      // suppression/fermeture, jamais envoyé tel quel.
      preview: URL.createObjectURL(item.file),
    }));
    if (next.length > 0) setMedias((prev) => [...prev, ...next]);
  };

  const handlePhotoFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const accepted: Array<{ kind: WizardMediaKind; name: string; mimeType: string; sizeBytes: number; file: File }> = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        setMediaError(`« ${file.name} » n’est pas une image — ignorée.`);
        continue;
      }
      if (file.size < 1 || file.size > MAX_MEDIA_BYTES) {
        setMediaError(`« ${file.name} » dépasse 25 Mo — ignorée.`);
        continue;
      }
      accepted.push({ kind: 'IMAGE', name: file.name, mimeType: file.type, sizeBytes: file.size, file });
    }
    pushMedias(accepted);
  };

  const handleVideoFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const accepted: Array<{ kind: WizardMediaKind; name: string; mimeType: string; sizeBytes: number; file: File }> = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('video/')) {
        setMediaError(`« ${file.name} » n’est pas une vidéo — ignorée.`);
        continue;
      }
      if (file.size < 1 || file.size > MAX_MEDIA_BYTES) {
        setMediaError(`« ${file.name} » dépasse 25 Mo — ignorée.`);
        continue;
      }
      accepted.push({ kind: 'VIDEO', name: file.name, mimeType: file.type, sizeBytes: file.size, file });
    }
    pushMedias(accepted);
  };

  const handleValidatedVoice = (voice: { blob: Blob; durationSeconds: number }) => {
    const ext = voice.blob.type.includes('mp4') || voice.blob.type.includes('m4a') ? 'm4a' : 'webm';
    const file = new File([voice.blob], `message-vocal.${ext}`, { type: voice.blob.type || 'audio/webm' });
    pushMedias([{
      kind: 'AUDIO',
      name: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      file,
    }]);
    setVoiceKey((k) => k + 1);
  };

  const removeMedia = (key: string) => {
    setMedias((prev) => {
      const target = prev.find((media) => media.key === key);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((media) => media.key !== key);
    });
  };

  const goNext = () => {
    setError(null);
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  };

  const goBack = () => {
    setError(null);
    if (step > 0) setStep((s) => s - 1);
  };

  const jumpTo = (targetStep: number) => {
    setError(null);
    setStep(targetStep);
  };

  /* GPS V4.1 — position opt-in via le helper central (meilleure précision
   * native : `enableHighAccuracy: true`, `maximumAge: 0`, repli rapide —
   * jamais de position en cache présentée comme actuelle). Optionnelle,
   * retirable, erreurs GPS non bloquantes (jamais d'erreur de mission). */
  const handleUseGeolocation = () => {
    setGeoError(null);
    setGeoLoading(true);
    void (async () => {
      try {
        const position = await getCurrentTravelPosition();
        setCoords(position);
      } catch (err) {
        setGeoError(err instanceof Error ? err.message : 'Position indisponible pour le moment.');
      } finally {
        setGeoLoading(false);
      }
    })();
  };

  /* Chantier D2 — le corps de la soumission AUTHENTIFIÉE historique.
   *
   * Factorisé hors de `handleSubmit` parce qu'il sert désormais DEUX fois :
   *  - le parcours client connecté (comportement d'aujourd'hui, inchangé) ;
   *  - le REPLI du parcours anonyme, si le brouillon est introuvable ou
   *    expiré au moment de convertir (le backend rend alors 404/410) : on
   *    repasse par `POST /demandes` avec l'état local, qui est la source de
   *    vérité et n'a jamais été perdu.
   *
   * Les gardes de validation restent appelées par `handleSubmit` AVANT les
   * deux chemins : elles ne sont pas dupliquées ici. */
  const submitAsAuthenticatedClient = async () => {
    setIsSubmitting(true);
    const hasDevice = domainId !== '' && domainId !== OTHER_DOMAIN;
    // 1. Upload réel de chaque fichier AVANT création (accès technicien
    // immédiat : les chemins sont liés en transaction à la Demande).
    const uploadedPaths: string[] = [];
    try {
      let done = 0;
      for (const media of medias) {
        if (!media.storagePath) {
          setUploadStatus(`Envoi des fichiers ${done + 1}/${medias.length}…`);
          const uploaded = await uploadDemandeMedia(media.file, media.kind);
          media.storagePath = uploaded.storagePath;
          uploadedPaths.push(uploaded.storagePath);
        }
        done += 1;
      }
      setUploadStatus(null);
      const result = await createDemande({
        categoryId: categoryId || 'autre',
        // Indice structuré, uniquement pour « Autre ».
        ...(domainId === OTHER_DOMAIN && equipmentFamily.trim()
          ? { equipmentFamily: equipmentFamily.trim() }
          : {}),
        description: description.trim(),
        medias: medias.map((media) => ({
          name: media.name,
          type: media.mimeType,
          size: media.sizeBytes,
          storagePath: media.storagePath,
        })),
        city: city.trim(),
        neighborhood: neighborhood.trim() || undefined,
        address: address.trim() || undefined,
        landmark: landmark.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        // GPS V1 — position opt-in uniquement.
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        requestedMode,
        requestedAt: requestedAtIso ?? undefined,
        domainId: hasDevice && domainId ? domainId : undefined,
        brandId: hasDevice && brandId ? brandId : undefined,
      });
      router.push(
        `/client/confirmation?ref=${encodeURIComponent(result.reference)}&id=${encodeURIComponent(
          result.id,
        )}&mode=${encodeURIComponent(requestedMode)}&req=${encodeURIComponent(requestedAtIso ?? '')}`,
      );
      return 'done';
    } catch (err) {
      setError(toUserErrorMessage(err, 'Une erreur est survenue. Réessayez.'));
      setUploadStatus(null);
      // Nettoyage best-effort des fichiers uploadés mais non liés (la
      // Demande n'existe pas) : évite les orphelins de stockage.
      for (const storagePath of uploadedPaths) {
        try {
          await deleteUploadedDemandeMedia(storagePath);
        } catch {
          /* abandon silencieux : le backend ne référence rien */
        }
      }
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setUploadStatus(null);
    // Description exigée (le bouton est déjà désactivé sinon ; le backend
    // revalide de toute façon). Les médias restent facultatives.
    if (description.trim().length < DESCRIPTION_MIN_LENGTH) {
      setError('Décrivez votre problème en quelques mots (10 caractères minimum).');
      return;
    }
    // Garde frontend (le backend revalide de toute façon).
    if (domainId === OTHER_DOMAIN && equipmentFamily.trim() === '') {
      setError('Sélectionnez le type d\u2019appareil qui correspond le mieux à votre situation.');
      return;
    }
    // Marque réelle obligatoire avec un domaine du catalogue.
    if (domainId !== '' && domainId !== OTHER_DOMAIN && brandId === '') {
      setError('Sélectionnez une marque disponible pour cette catégorie.');
      return;
    }

    /* Chantier D2 — un visiteur sans compte n'envoie RIEN ici : la Demande
     * exige un `clientId`. On ouvre la modale d'authentification, et c'est
     * `handleAuthSuccess` qui reprendra la main (upload + conversion du
     * brouillon). Aucune validation n'est dupliquée : les trois gardes ci-
     * dessus viennent de passer, donc le parcours post-auth est déjà conforme
     * au contrat `POST /demandes`. */
    if (isAnonymousMode) {
      setStageError(null);
      setFailedMedias([]);
      setAuthModalOpen(true);
      return;
    }

    await submitAsAuthenticatedClient();
  };

  /* ── Chantier D2 —.upload des médias (reporté après inscription) ──────
   *
   * Un visiteur anonyme ne pouvait PAS déposer de fichier avant d'avoir un
   * compte : `POST /demandes/medias/upload` est protégé. On n'a donc les
   * octets que dans l'état local (`WizardMedia.file`) et on les envoie une
   * fois le cookie posé.
   *
   * Un média déjà uploadé (`storagePath` en mémoire) n'est pas ré-envoyé — ce
   * qui rend le bouton « Réessayer » idempotent.
   *
   * Échec : on NE bloque pas le tout. Les médias refusés sont rendus au
   * parent, qui propose « Réessayer » ou « Continuer sans ce fichier ». */
  const uploadPendingMedias = async (candidates: WizardMedia[] = medias) => {
    const pending = candidates.filter((media) => !media.storagePath);
    if (pending.length === 0) return { failed: [] as WizardMedia[] };
    const failed: WizardMedia[] = [];
    let done = 0;
    for (const media of pending) {
      setUploadStatus(`Envoi des fichiers ${done + 1}/${pending.length}…`);
      try {
        const uploaded = await uploadDemandeMedia(media.file, media.kind);
        media.storagePath = uploaded.storagePath;
      } catch {
        failed.push(media);
      }
      done += 1;
    }
    setUploadStatus(null);
    return { failed };
  };

  /* ── Chantier D2 — conversion du brouillon en vraie Demande ──────────
   *
   * Appelée après `refresh()` : le cookie CLIENT est en place, donc
   * `POST /demandes/drafts/:token/convert` passe ses guards. Le brouillon
   * devient une `Demande` SUBMITTED et le dispatch vague 1 est déclenché par
   * le backend — on ne fait que transporter les médias. */
  /* `scope` borne à la fois l'upload ET la liste convertie : « Continuer
   * sans ce fichier » exclut donc réellement le média de la Demande, au lieu
   * de l'envoyer sans `storagePath` (ce qui créerait une ligne média vide). */
  const runDraftConversion = async (scope: WizardMedia[] = medias): Promise<ConversionOutcome> => {
    const token = draftToken ?? readDemandeDraftToken();
    /* Repli 1 : aucun brouillon (token perdu, effacé, expiré avant la
     * modale). L'état local est la vérité — on repasse par le flux direct. */
    if (!token) {
      setAuthModalOpen(false);
      await submitAsAuthenticatedClient();
      return 'done';
    }

    setConverting(true);
    const { failed } = await uploadPendingMedias(scope);
    if (failed.length > 0) {
      setFailedMedias(failed);
      setConverting(false);
      return 'media-failed';
    }

    try {
      const result = await convertDemandeDraft(
        token,
        scope.map((media) => ({
          kind: media.kind,
          name: media.name,
          mimeType: media.mimeType,
          sizeBytes: media.sizeBytes,
          ...(media.storagePath ? { storagePath: media.storagePath } : {}),
        })),
      );
      /* Le token n'a plus servi : on l'efface de localStorage ET de l'état,
       * sinon le prochain wizard repartirait d'un brouillon déjà converti
       * (409 à la conversion suivante). */
      clearDemandeDraftToken();
      setDraftToken(null);
      draftSyncedRef.current = null;
      setAuthModalOpen(false);
      router.push(
        `/client/confirmation?ref=${encodeURIComponent(result.reference)}&id=${encodeURIComponent(
          result.id,
        )}&mode=${encodeURIComponent(requestedMode)}&req=${encodeURIComponent(requestedAtIso ?? '')}`,
      );
      return 'done';
    } catch (err) {
      /* 410 Gone : brouillon expiré pendant la saisie. Repli 2 — le backend
       * a explicitement prévu ce cas et la demande doit partir. */
      if (err instanceof ApiError && (err.status === 410 || err.status === 404)) {
        clearDemandeDraftToken();
        setDraftToken(null);
        draftSyncedRef.current = null;
        setAuthModalOpen(false);
        await submitAsAuthenticatedClient();
        return 'done';
      }
      /* 401 : le cookie n'est pas (ou plus) valable. Cas distinct d'une
       * erreur serveur — la modale doit proposer de se reconnecter, pas
       * « Réessayez ». */
      if (err instanceof ApiError && err.status === 401) {
        setConverting(false);
        return 'unauthorized';
      }
      setStageError(toUserErrorMessage(err, 'Envoi impossible. Réessayez.'));
      setConverting(false);
      return 'error';
    }
  };

  /* ── Chantier D2.5 — sortie de modale : le tunnel est DÉBLOQUÉ ───────
   *
   * Ce bloc était, en D2, un cul-de-sac : à l'inscription le backend ne posait
   * pas de cookie (`if (user.emailVerified)`), donc `convert` aurait répondu
   * 401 et la demande ne pouvait pas partir. On se contentait d'afficher «
   * vérifiez votre e-mail » et de garder le brouillon.
   *
   * D2.5 pose le cookie SYSTÉMATIQUEMENT (`auth.controller.ts`) : la
   * vérification d'e-mail reste obligatoire pour ACCÉDER au dashboard, mais
   * elle ne conditionne plus l'IDENTITÉ. On peut donc convertir immédiatement.
   *
   * Deux sorties, parce que le `RoleGuard` (`guard-decision.ts`) continuera de
   * bloquer `/client/*` tant que l'e-mail n'est pas vérifié :
   *  - e-mail vérifié  → `/client/confirmation` (historique, inchangé) ;
   *  - e-mail à vérifier → la demande EST envoyée, on prévient, puis on envoie
   *    vers `/client/verification?from=demande` pour que le panneau sache
   *    qu'une demande existe et redirige vers la liste après validation. */
  const handleAuthSuccess = async (verifiedUser: AuthUser) => {
    setStageError(null);
    setNeedsSignIn(false);
    setSignInRequestId(0);
    setFailedMedias([]);
    await refresh();

    /* Le wizard attend maintenant le RÉSULTAT de la conversion : sans cela la
     * modale se fermerait sur un échec et l'utilisateur ne comprendrait pas
     * que sa demande n'est pas partie. */
    const outcome = await runDraftConversion();

    /* 401 : le cookie n'a pas été posé (backend non redéployé, session
     * expirée entre-temps). On ne pretend pas que c'est réussi. */
    if (outcome === 'unauthorized') {
      setNeedsSignIn(true);
      setStageError(
        'Connexion requise. Reconnectez-vous pour envoyer votre demande, qui est conservée.',
      );
      return;
    }
    if (outcome !== 'done') return;

    if (verifiedUser.emailVerified === false) {
      /* La demande EST partie : on ne montre pas une erreur. `from=demande`
       * est le signal qui fera que `/client/verification` redirigera vers la
       * liste des missions au lieu du dashboard. */
      setDraftNotice(null);
      setAuthModalOpen(false);
      router.push(
        `/client/verification?email=${encodeURIComponent(verifiedUser.email)}&from=demande`,
      );
      return;
    }
    /* Cas vérifié : `runDraftConversion` a déjà redirigé vers la confirmation. */
  };

  /* UI-2 : avertit avant de perdre une demande commencée (rechargement,
   * fermeture d'onglet). Inactif quand le wizard est vide ou en envoi. */
  const hasStarted =
    step > 0 ||
    city.trim() !== '' ||
    contactPhone.trim() !== '' ||
    domainId !== '' ||
    equipmentFamily.trim() !== '' ||
    description.trim() !== '' ||
    medias.length > 0 ||
    coords !== null;
  useEffect(() => {
    /* `converting` est indispensable autant que `isSubmitting` : depuis D2.5,
     * le parcours anonyme passe par `runDraftConversion`, qui pilote l'état
     * `converting` — `isSubmitting` reste donc à `false` pendant l'upload et
     * la conversion. Sans ce second garde, le listener restait armé et la
     * redirection finale déclenchait le dialogue natif « Quitter la page ? »,
     * que l'utilisateur voit comme un échec alors que sa demande est partie. */
    if (!hasStarted || isSubmitting || converting) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasStarted, isSubmitting, converting]);

  return (
    <div className="space-y-4">
      {/* Chantier D2 — bandeau discret du parcours anonyme. Pas de bouton,
          pas d'alerte : c'est une information, pas un avertissement. */}
      {isAnonymousMode ? (
        <p className="text-sm text-muted-foreground">
          Votre progression est sauvegardée automatiquement. Vous pourrez créer votre compte à la
          fin.
        </p>
      ) : null}
      {draftNotice ? <Alert variant="info" dense>{draftNotice}</Alert> : null}

      <StickyRecap
        device={
          selectedDeviceLabel
            ? selectedDeviceLabel
            : domainId === OTHER_DOMAIN
              ? families.find((f) => f.code === equipmentFamily)?.label ?? 'Autre appareil'
              : ''
        }
        description={description.trim() || mediaSummary}
        location={locationLabel}
        timing={formatRequestedTiming(requestedMode, requestedAtIso)}
        onEdit={jumpTo}
      />

      <Card>
        <CardContent className="space-y-5 pt-4">
          <StepProgress current={step} labels={STEPS} />

          {error ? <Alert variant="error">{error}</Alert> : null}

          <div key={step} className="animate-pop-in">
            {step === 0 ? (
              <section className="space-y-5" aria-label="Votre appareil">
                <div>
                  <p className="text-base font-semibold">Quel appareil avez-vous ?</p>
                  <p className="text-sm text-muted-foreground">
                    Choisissez la catégorie la plus proche, puis la marque de votre appareil.
                  </p>
                </div>

                {catalogLoading ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-hidden>
                    {Array.from({ length: 6 }).map((_, index) => (
                      /* UI-0 : shimmer unifié du design system (`Skeleton`, 1.6 s). */
                      <Skeleton key={index} className="h-28 rounded-xl" />
                    ))}
                  </div>
                ) : domains.length === 0 ? (
                  <EmptyState
                    icon={<Icon name="wrench" size="md" />}
                    title="Catalogue indisponible"
                    description="Le catalogue n'a pas pu être chargé. Déposez quand même votre demande, un technicien vous la décrira."
                    action={
                      <Button variant="secondary" size="sm" onClick={() => handleDomainChange(OTHER_DOMAIN)}>
                        Décrire sans catégorie
                      </Button>
                    }
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {domains.map((domain) => (
                      <DomainTile
                        key={domain.id}
                        icon={domainIcon(domain)}
                        title={domain.name}
                        description={domain.description ?? undefined}
                        selected={domainId === domain.id}
                        onClick={() => handleDomainChange(domain.id)}
                      />
                    ))}
                    <DomainTile
                      icon="plus"
                      title="Autre appareil"
                      description="Non présent dans la liste"
                      selected={domainId === OTHER_DOMAIN}
                      onClick={() => handleDomainChange(OTHER_DOMAIN)}
                    />
                  </div>
                )}

                {domainId && domainId !== OTHER_DOMAIN ? (
                  <div className="space-y-5">
                    <DeviceChips
                      label="Marque"
                      chips={brands.map((brand) => ({ id: brand.id, label: brand.name }))}
                      selectedId={brandId}
                      onSelect={handleBrandChange}
                      empty={{
                        icon: 'shield',
                        title: 'Aucune marque disponible',
                        description: "Cette marque n'est pas encore disponible sur Relio.",
                      }}
                    />
                  </div>
                ) : null}

                  {domainId === OTHER_DOMAIN ? (
                    <div className="space-y-3">
                      {/* Indice structuré (famille reconnue, pas le modèle,
                        pas un diagnostic catalogue). La description de
                        l'étape suivante reste le récit de la panne. */}
                      <p className="text-sm font-medium">
                        Quel type d&apos;appareil souhaitez-vous faire réparer ?
                      </p>
                      <div className="flex flex-wrap gap-2" role="group" aria-label="Type d'appareil">
                        {families.length === 0 ? (
                          <EmptyState
                            icon={<Icon name="wrench" size="md" />}
                            title="Types d'appareil indisponibles"
                            description="Rechargez la page. Si le problème persiste, choisissez une catégorie dans la liste."
                          />
                        ) : (
                          families.map((family) => (
                            <SelectChip
                              key={family.code}
                              selected={equipmentFamily === family.code}
                              onClick={() => setEquipmentFamily(family.code)}
                            >
                              {family.icon ? `${family.icon} ` : ''}
                              {family.label}
                            </SelectChip>
                          ))
                        )}
                      </div>
                      <Alert variant="neutral" dense icon="info">
                        Décrivez votre panne à l&apos;étape suivante : le technicien la verra directement.
                      </Alert>
                    </div>
                  ) : null}
              </section>
            ) : null}

            {step === 1 ? (
              <section className="space-y-5" aria-label="Votre panne">
                <div>
                  <p className="text-base font-semibold">Décrivez votre panne</p>
                  <p className="text-sm text-muted-foreground">
                    Expliquez avec vos mots ce qui ne fonctionne plus. Vous pouvez ajouter des
                    photos, une vidéo ou un vocal en complément (facultatif, max {MAX_MEDIAS}{' '}
                    fichiers, 25 Mo chacun).
                  </p>
                </div>

                <Field
                  label="Description du problème"
                  htmlFor="demande-description"
                  required
                  hint={`10 caractères minimum (${description.trim().length}/10).`}
                >
                  <Textarea
                    id="demande-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={1000}
                    rows={4}
                    placeholder="Ex. : Mon téléphone ne charge plus depuis hier, même avec un autre câble."
                    autoComplete="off"
                  />
                </Field>

                {/* 1. Message vocal (complément facultatif) */}
                <Field
                  label="Message vocal"
                  hint={`Décrivez oralement la panne (max ${VOICE_MAX_SECONDS / 60} min). Rien n'est envoyé sans validation.`}
                  error={mediaError}
                >
                  <VoiceRecorder
                    key={voiceKey}
                    onValidated={handleValidatedVoice}
                    onCleared={() => undefined}
                    disabled={isSubmitting || medias.length >= MAX_MEDIAS}
                  />
                </Field>

                {/* 2. Vidéo (facultatif) */}
                <Field
                  label="Vidéo (facultatif)"
                  hint="Filmez la panne ou choisissez une vidéo (25 Mo max)."
                  error={mediaError}
                >
                  <label
                    htmlFor="demande-video"
                    className={cn(
                      'inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card px-4 text-sm font-medium',
                      'transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      (isSubmitting || medias.length >= MAX_MEDIAS) && 'pointer-events-none opacity-50',
                    )}
                  >
                    <Icon name="video" size="sm" />
                    Ajouter une vidéo
                  </label>
                  <input
                    id="demande-video"
                    type="file"
                    accept="video/*"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      handleVideoFiles(e.target.files);
                      e.target.value = '';
                    }}
                    disabled={isSubmitting}
                  />
                </Field>

                {/* 3. Photos (facultatif) */}
                <Field
                  label="Photos (facultatif)"
                  hint={`Jusqu’à ${MAX_MEDIAS} fichiers au total · 25 Mo maximum chacun.`}
                  error={mediaError}
                >
                  <label
                    htmlFor="demande-photos"
                    className={cn(
                      'inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card px-4 text-sm font-medium',
                      'transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      (isSubmitting || medias.length >= MAX_MEDIAS) && 'pointer-events-none opacity-50',
                    )}
                  >
                    <Icon name="plus" size="sm" />
                    Ajouter des photos
                  </label>
                  <input
                    id="demande-photos"
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      handlePhotoFiles(e.target.files);
                      e.target.value = '';
                    }}
                    disabled={isSubmitting}
                  />
                </Field>

                {medias.length > 0 ? (
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Médias sélectionnés">
                    {medias.map((media) => (
                      <li
                        key={media.key}
                        className="overflow-hidden rounded-xl border border-border bg-card"
                      >
                        <div className="relative">
                          {media.kind === 'IMAGE' && media.preview ? (
                            <img
                              src={media.preview}
                              alt={media.name}
                              className="h-20 w-full object-cover"
                            />
                          ) : media.kind === 'VIDEO' && media.preview ? (
                            <video
                              src={media.preview}
                              preload="metadata"
                              aria-label={`Aperçu ${media.name}`}
                              className="h-20 w-full bg-black object-cover"
                            />
                          ) : (
                            <span className="flex h-20 w-full items-center justify-center bg-muted/40 text-muted-foreground">
                              <Icon name={media.kind === 'AUDIO' ? 'mic' : 'file'} size="md" />
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeMedia(media.key)}
                            aria-label={`Retirer ${media.name}`}
                            className="absolute -right-1 -top-1 flex size-10 items-center justify-center rounded-full bg-black/60 text-white transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-95"
                          >
                            <Icon name="x" size="sm" />
                          </button>
                        </div>
                        <p className="truncate px-1.5 pt-1 text-2xs font-medium">{media.name}</p>
                        <p className="px-1.5 pb-1.5 text-2xs text-muted-foreground">
                          {media.kind === 'AUDIO' ? 'Vocal' : media.kind === 'VIDEO' ? 'Vidéo' : 'Photo'} • {formatFileSize(media.sizeBytes)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ) : null}

            {step === 2 ? (
              <section className="space-y-5" aria-label="Où et quand ?">
                <Field label="Ville *" htmlFor="demande-city" hint="Ville où se déroule l’intervention.">
                  <Input
                    id="demande-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex. : Yaoundé"
                    autoComplete="address-level2"
                  />
                </Field>

                <Field label="Adresse précise (facultatif)" htmlFor="demande-address">
                  <Input
                    id="demande-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ex. : 12 rue des Lilas, 3e étage"
                    autoComplete="street-address"
                  />
                </Field>

                <Field label="Quartier / secteur (facultatif)" htmlFor="demande-neighborhood">
                  <Input
                    id="demande-neighborhood"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Ex. : Mbankomo, quartier centre"
                  />
                </Field>

                <Field label="Point de repère (facultatif)" htmlFor="demande-landmark">
                  <Input
                    id="demande-landmark"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="Ex. : à côté de la pharmacie du quartier"
                  />
                </Field>

                <Field
                  label="Téléphone pour l'intervention (facultatif)"
                  htmlFor="demande-contact-phone"
                  hint="Communicable uniquement au technicien qui interviendra."
                >
                  <Input
                    id="demande-contact-phone"
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="Ex. : +237 6 00 00 00 00"
                    autoComplete="tel"
                  />
                </Field>

                <div className="space-y-2">
                  <span className="block text-sm font-medium">Position GPS (facultatif)</span>
                  <p className="text-xs text-muted-foreground">
                    Aide à trouver un technicien proche. Votre adresse ci-dessus reste inchangée.
                  </p>
                  {coords ? (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-success-border bg-success-soft px-3 py-2.5">
                      <p className="text-sm font-medium text-success-ink">
                        Position enregistrée pour cette demande.
                        {(() => {
                          const short = formatTravelAccuracyShort(coords.accuracy);
                          return short ? ` Précision estimée : ${short}.` : '';
                        })()}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCoords(null)}
                        disabled={isSubmitting}
                      >
                        Retirer
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleUseGeolocation}
                      isLoading={geoLoading}
                      disabled={isSubmitting}
                      className="w-full sm:w-auto"
                    >
                      <Icon name="pin" size="sm" />
                      Utiliser ma position
                    </Button>
                  )}
                  {geoError ? <Alert variant="error" dense>{geoError}</Alert> : null}
                </div>

                <div className="space-y-2">
                  <span className="block text-sm font-medium">Quand souhaitez-vous être dépanné ? *</span>
                  <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Moment souhaité">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={requestedMode === 'ASAP'}
                      onClick={() => setRequestedMode('ASAP')}
                      className={cn(
                        'rounded-lg border p-3.5 text-left transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        requestedMode === 'ASAP'
                          ? 'border-primary bg-secondary text-secondary-foreground'
                          : 'border-border bg-card text-foreground hover:bg-muted',
                      )}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <Icon name="clock" size="4.5" />
                        Dès que possible
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Nous cherchons un technicien disponible rapidement près de chez vous.
                      </span>
                    </button>

                    <button
                      type="button"
                      role="radio"
                      aria-checked={requestedMode === 'SCHEDULED'}
                      onClick={() => setRequestedMode('SCHEDULED')}
                      className={cn(
                        'rounded-lg border p-3.5 text-left transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        requestedMode === 'SCHEDULED'
                          ? 'border-primary bg-secondary text-secondary-foreground'
                          : 'border-border bg-card text-foreground hover:bg-muted',
                      )}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <Icon name="calendar" size="4.5" />
                        À une date précise
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Vous choisissez le moment ; nous trouvons un technicien disponible.
                      </span>
                    </button>
                  </div>

                  {requestedMode === 'SCHEDULED' ? (
                    <Field label="Date et heure souhaitées *" htmlFor="demande-datetime">
                      <Input
                        id="demande-datetime"
                        type="datetime-local"
                        value={requestedAt}
                        min={minRequestedAt}
                        onChange={(e) => setRequestedAt(e.target.value)}
                      />
                    </Field>
                  ) : null}
                </div>
              </section>
            ) : null}

            {step === 3 ? (
              <section className="space-y-4" aria-label="Vérification">
                <div className="space-y-2">
                  <SummaryRow
                    icon="briefcase"
                    label="Appareil"
                    value={
                      selectedDeviceLabel
                        ? selectedDeviceLabel
                        : domainId === OTHER_DOMAIN
                          ? families.find((f) => f.code === equipmentFamily)?.label ??
                            'Mon appareil n’est pas dans la liste'
                          : 'Non renseigné'
                    }
                    onEdit={() => jumpTo(0)}
                  />
                  <SummaryRow
                    icon="file"
                    label="Panne"
                    value={
                      mediaSummary ? `${description.trim()} (+ ${mediaSummary})` : description.trim() || 'À décrire'
                    }
                    onEdit={() => jumpTo(1)}
                  />
                  <SummaryRow
                    icon="pin"
                    label="Localisation"
                    value={locationLabel}
                    onEdit={() => jumpTo(2)}
                  />
                  <SummaryRow
                    icon="clock"
                    label="Moment souhaité"
                    value={formatRequestedTiming(requestedMode, requestedAtIso)}
                    onEdit={() => jumpTo(2)}
                  />
                </div>

                <Alert variant="info">
                  Vous recevrez un devis à valider avant toute intervention. Aucun paiement n’est demandé
                  ici.
                </Alert>
                {uploadStatus ? (
                  <Alert variant="info" dense>
                    {uploadStatus}
                  </Alert>
                ) : null}
              </section>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center">
            {step > 0 ? (
              <Button type="button" variant="secondary" onClick={goBack} disabled={isSubmitting} className="min-h-12 w-full text-sm sm:w-auto sm:text-base">
                Retour
              </Button>
            ) : null}

            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={goNext} disabled={!canContinue} className="min-h-12 w-full flex-1 text-sm sm:text-base">
                Continuer
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} isLoading={isSubmitting} className="min-h-12 w-full flex-1 text-sm sm:text-base" size="lg">
                Envoyer la demande
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chantier D2 — modale d'authentification. Montée ici (et non dans la
          page) parce qu'elle a besoin de l'état du wizard : medias à uploader,
          brouillon à convertir, et `refresh()` du contexte d'authentification.
          `sheet` : plein écran/bottom-sheet sur mobile, centré sur desktop. */}
      <DemandeAuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        city={city}
        address={address}
        busyLabel={
          converting
            ? uploadStatus ?? 'Finalisation…'
            : undefined
        }
        stageError={stageError}
        showSignInCta={needsSignIn}
        onSwitchToSignIn={() => {
          /* Bascule vers l'onglet connexion : on lève l'alerte et on
           * incrémente le compteur, la modale applique le changement d'onglet
           * (elle garde la maîtrise de son propre état). */
          setNeedsSignIn(false);
          setStageError(null);
          setSignInRequestId((n) => n + 1);
        }}
        signInRequestId={signInRequestId}
        failedMediaCount={failedMedias.length}
        onRetryMedia={() => {
          /* On retente le périmètre COMPLET : `uploadPendingMedias` ignore
             ceux qui portent déjà un `storagePath`, donc les fichiers déjà
             acceptés ne sont pas ré-envoyés. */
          setFailedMedias([]);
          setStageError(null);
          void runDraftConversion();
        }}
        onSkipMedia={() => {
          /* Les médias refusés sont écartés de CETTE conversion — upload ET
             corps de la conversion. Ils restent dans la grille : l'utilisateur
             peut les garder pour une nouvelle demande, on ne détruit pas sa
             saisie. */
          const refused = failedMedias;
          setFailedMedias([]);
          setStageError(null);
          void runDraftConversion(medias.filter((m) => !refused.includes(m)));
        }}
      />
    </div>
  );
}

interface DeviceChipsProps {
  label: string;
  chips: Array<{ id: string; label: string }>;
  selectedId: string;
  onSelect: (id: string) => void;
  empty: { icon: IconName; title: string; description: string };
}

function DeviceChips({ label, chips, selectedId, onSelect, empty }: DeviceChipsProps) {
  const isEmpty = chips.length === 0 && selectedId === '';
  return (
    <div className="space-y-2.5">
      <p className="text-sm font-medium">{label}</p>
      {isEmpty ? (
        <EmptyState
          icon={<Icon name={empty.icon} size="md" />}
          title={empty.title}
          description={empty.description}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <SelectChip key={chip.id} selected={selectedId === chip.id} onClick={() => onSelect(chip.id)}>
              {chip.label}
            </SelectChip>
          ))}
        </div>
      )}
    </div>
  );
}

interface SelectChipProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}

function SelectChip({ selected, onClick, children }: SelectChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected
          ? 'border-primary bg-primary text-primary-foreground shadow-card'
          : 'border-border bg-card text-foreground hover:bg-muted',
      )}
    >
      {selected ? <Icon name="check" size="3.5" strokeWidth={2.5} /> : null}
      {children}
    </button>
  );
}

interface DomainTileProps {
  icon: IconName;
  title: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
}

function DomainTile({ icon, title, description, selected, onClick }: DomainTileProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'group flex flex-col items-start gap-2.5 rounded-xl border p-3.5 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        selected ? 'border-primary bg-secondary ring-1 ring-primary' : 'border-border bg-card hover:bg-muted',
      )}
    >
      <span
        className={cn(
          'flex size-9 items-center justify-center rounded-lg transition-colors',
          selected
            ? 'bg-primary text-primary-foreground'
            : 'bg-primary/10 text-primary group-hover:bg-primary/15',
        )}
      >
        <Icon name={icon} size="sm" strokeWidth={2} />
      </span>
      <span>
        <span className="block text-sm font-semibold leading-tight">{title}</span>
        {description ? (
          <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{description}</span>
        ) : null}
      </span>
    </button>
  );
}

/* Mémoïsé : props stables (index + labels constants) — ne se re-rend pas
 * à chaque frappe dans les champs du wizard. */
const StepProgress = memo(function StepProgress({ current, labels }: { current: number; labels: string[] }) {
  const percent = Math.round(((current + 1) / labels.length) * 100);
  return (
    <div className="space-y-2" role="group" aria-label="Progression">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground">
          Étape {current + 1} / {labels.length}
        </p>
        <p className="text-sm font-semibold">{labels[current]}</p>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
        <div className="motion-safe:animate-sheen absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-50" />
      </div>
      <ol className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Étapes">
        {labels.map((label, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li
              key={label}
              /* `aria-current` expose l'étape active aux lecteurs d'écran
               * (l'indicateur visuel ci-dessous reste purement décoratif). */
              aria-current={active ? 'step' : undefined}
              className={cn(
                'flex items-center gap-1.5 text-2xs font-medium sm:text-xs',
                active
                  ? 'font-bold text-primary'
                  : done
                    ? 'text-primary/70'
                    : 'text-muted-foreground',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : done
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {done ? <Icon name="check" size="3.5" strokeWidth={3} /> : index + 1}
              </span>
              <span className={active ? 'underline decoration-primary/40 underline-offset-4' : undefined}>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
});

interface StickyRecapProps {
  device: string;
  description: string;
  location: string;
  timing: string;
  onEdit: (step: number) => void;
}

function StickyRecap({ device, description, location, timing, onEdit }: StickyRecapProps) {
  const rows: Array<{ icon: IconName; label: string; value: string; step: number }> = [
    { icon: 'briefcase', label: 'Appareil', value: device, step: 0 },
    { icon: 'file', label: 'Panne (multimédia)', value: description || 'À décrire', step: 1 },
    { icon: 'pin', label: 'Localisation', value: location || 'À préciser', step: 2 },
    { icon: 'clock', label: 'Quand', value: timing, step: 2 },
  ];
  return (
    <aside className="sticky top-14 z-10" aria-label="Récapitulatif de la demande">
      <Card className="overflow-hidden shadow-float">
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3.5 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Récap</p>
          <span className="text-2xs text-muted-foreground">mis à jour en direct</span>
        </div>
        <div className="divide-y divide-border/70 px-3.5 py-1">
          {rows.map((row) => (
            <button
              key={row.label}
              type="button"
              onClick={() => onEdit(row.step)}
              aria-label={`Modifier : ${row.label}`}
              className="group flex w-full items-center gap-2.5 rounded-lg py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon name={row.icon} size="3.5" className="text-muted-foreground" />
              <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground">{row.label}</span>
              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-xs font-medium',
                  row.value && row.value !== 'À décrire' && row.value !== 'À préciser'
                    ? 'text-foreground'
                    : 'text-muted-foreground/70',
                )}
              >
                {row.value || '—'}
              </span>
              {row.value ? (
                <Icon
                  name="chevron-right"
                  size="3.5"
                  className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                />
              ) : null}
            </button>
          ))}
        </div>
      </Card>
    </aside>
  );
}

interface SummaryRowProps {
  icon: 'wrench' | 'briefcase' | 'file' | 'pin' | 'clock';
  label: string;
  value: string;
  onEdit: () => void;
}

function SummaryRow({ icon, label, value, onEdit }: SummaryRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon name={icon} size="4.5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-sm whitespace-pre-line">{value}</p>
        </div>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
        Modifier
      </Button>
    </div>
  );
}