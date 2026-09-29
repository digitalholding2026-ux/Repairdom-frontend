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
import { VoiceRecorder, VOICE_MAX_SECONDS } from '@/components/client/voice-recorder';
import { cn } from '@/lib/cn';
import { formatFileSize } from '@/lib/format';
import { formatRequestedTiming, type RequestTimingMode } from '@/lib/request-timing';
import { createDemande, uploadDemandeMedia, deleteUploadedDemandeMedia } from '@/lib/api/request-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';
import {
  formatTravelAccuracyShort,
  getCurrentTravelPosition,
} from '@/lib/travel-location';
import {
  listCatalogDomains,
  listCatalogBrands,
  listCatalogModels,
  type CatalogDomainLite,
  type CatalogBrandLite,
  type CatalogModelLite,
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

export function DemandeWizard() {
  const router = useRouter();

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
  const [domains, setDomains] = useState<CatalogDomainLite[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [domainId, setDomainId] = useState('');
  const [domainName, setDomainName] = useState('');
  const [brandId, setBrandId] = useState('');
  const [modelId, setModelId] = useState('');
  const [brands, setBrands] = useState<CatalogBrandLite[]>([]);
  const [models, setModels] = useState<CatalogModelLite[]>([]);

  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    listCatalogDomains()
      .then((list) => {
        if (active) setDomains(list);
      })
      .catch(() => {
        if (active) setDomains([]);
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  /* Préremplissage depuis le profil (ville, téléphone) : uniquement si le
   * champ est encore vide — ne JAMAIS écraser une saisie manuelle. Échec
   * silencieux : le formulaire reste utilisable sans profil. */
  useEffect(() => {
    let active = true;
    getMe()
      .then((me) => {
        if (!active) return;
        if (me.city) setCity((prev) => prev.trim() !== '' ? prev : me.city ?? '');
        if (me.phone) setContactPhone((prev) => prev.trim() !== '' ? prev : me.phone ?? '');
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

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
    const model = models.find((m) => m.id === modelId);
    if (model) parts.push(model.name);
    return parts.join(' — ');
  }, [domainName, brands, brandId, models, modelId]);

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
    if (step === 0) return domainId !== '';
    // Dépôt multimédia : au moins un moyen validé (vocal, vidéo ou photo).
    if (step === 1) return medias.length > 0;
    if (step === 2) return city.trim() !== '' && (requestedMode === 'ASAP' || requestedAt !== '');
    return true;
  }, [step, domainId, medias, city, requestedMode, requestedAt]);

  const handleDomainChange = (id: string) => {
    setDomainId(id);
    setBrandId('');
    setModelId('');
    setBrands([]);
    setModels([]);
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
    setModelId('');
    setModels([]);
    if (id) {
      listCatalogModels(id)
        .then(setModels)
        .catch(() => setModels([]));
    }
  };

  const handleModelChange = (id: string) => {
    setModelId(id);
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

  const handleSubmit = async () => {
    setError(null);
    setUploadStatus(null);
    // Dépôt multimédia : au moins un moyen validé (le bouton est déjà
    // désactivé sinon ; le backend revalide de toute façon).
    if (medias.length === 0) {
      setError('Ajoutez un message vocal, une vidéo ou au moins une photo pour décrire votre problème.');
      return;
    }
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
        modelId: hasDevice && modelId ? modelId : undefined,
      });
      router.push(
        `/client/confirmation?ref=${encodeURIComponent(result.reference)}&id=${encodeURIComponent(
          result.id,
        )}&mode=${encodeURIComponent(requestedMode)}&req=${encodeURIComponent(requestedAtIso ?? '')}`,
      );
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

  /* UI-2 : avertit avant de perdre une demande commencée (rechargement,
   * fermeture d'onglet). Inactif quand le wizard est vide ou en envoi. */
  const hasStarted =
    step > 0 ||
    city.trim() !== '' ||
    contactPhone.trim() !== '' ||
    domainId !== '' ||
    medias.length > 0 ||
    coords !== null;
  useEffect(() => {
    if (!hasStarted || isSubmitting) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasStarted, isSubmitting]);

  return (
    <div className="space-y-4">
      <StickyRecap
        device={
          selectedDeviceLabel
            ? selectedDeviceLabel
            : domainId === OTHER_DOMAIN
              ? 'Autre appareil'
              : ''
        }
        description={mediaSummary}
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
                    Choisissez la catégorie la plus proche, puis affinez si besoin.
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
                      quickOption="Toutes les marques"
                      chips={brands.map((brand) => ({ id: brand.id, label: brand.name }))}
                      selectedId={brandId}
                      onSelect={handleBrandChange}
                      empty={{
                        icon: 'shield',
                        title: 'Aucune marque référencée',
                        description: 'Vous pouvez déposer votre demande sans préciser la marque.',
                      }}
                    />

                    {brandId ? (
                      <DeviceChips
                        label={`Modèle${brandId ? ` (${brands.find((b) => b.id === brandId)?.name ?? ''})` : ''}`}
                        quickOption="Tous les modèles"
                        chips={models.map((model) => ({ id: model.id, label: model.name }))}
                        selectedId={modelId}
                        onSelect={handleModelChange}
                        empty={{
                          icon: 'file',
                          title: 'Aucun modèle répertorié',
                          description: 'Montrez votre panne à l’étape suivante (vocal, vidéo ou photos).',
                        }}
                      />
                    ) : null}
                  </div>
                ) : null}

                  {domainId === OTHER_DOMAIN ? (
                    <Alert variant="neutral" dense icon="info">
                      Montrez votre panne à l&apos;étape suivante (vocal, vidéo ou photos) : le technicien la verra directement.
                    </Alert>
                  ) : null}
              </section>
            ) : null}

            {step === 1 ? (
              <section className="space-y-5" aria-label="Votre panne en multimédia">
                <div>
                  <p className="text-base font-semibold">Montrez votre panne</p>
                  <p className="text-sm text-muted-foreground">
                    Décrivez par message vocal, vidéo ou photos — un seul suffit, cumulable
                    (max {MAX_MEDIAS} fichiers, 25 Mo chacun).
                  </p>
                </div>

                {/* 1. Message vocal (prioritaire au tactile) */}
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

                {/* 2. Vidéo */}
                <Field
                  label="Vidéo"
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

                {/* 3. Photos */}
                <Field
                  label="Photos"
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
                          ? 'Mon appareil n’est pas dans la liste'
                          : 'Non renseigné'
                    }
                    onEdit={() => jumpTo(0)}
                  />
                  <SummaryRow
                    icon="file"
                    label="Panne (multimédia)"
                    value={mediaSummary || 'À décrire'}
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
    </div>
  );
}

interface DeviceChipsProps {
  label: string;
  chips: Array<{ id: string; label: string }>;
  selectedId: string;
  onSelect: (id: string) => void;
  empty: { icon: IconName; title: string; description: string };
  quickOption?: string;
}

function DeviceChips({ label, chips, selectedId, onSelect, empty, quickOption }: DeviceChipsProps) {
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
          {quickOption ? (
            <SelectChip selected={selectedId === ''} onClick={() => onSelect('')}>
              {quickOption}
            </SelectChip>
          ) : null}
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
      <ol className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Étapes">
        {labels.map((label, index) => (
          <li
            key={label}
            className={cn(
              'text-2xs font-medium sm:text-xs',
              index <= current ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {index + 1}. {label}
          </li>
        ))}
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