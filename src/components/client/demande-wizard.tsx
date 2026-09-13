'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Icon, ICON_NAMES, type IconName } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/cn';
import { formatRequestedTiming, type RequestTimingMode } from '@/lib/request-timing';
import { createDemande } from '@/lib/api/request-service';
import {
  listCatalogDomains,
  listCatalogBrands,
  listCatalogModels,
  listCatalogProblems,
  type CatalogDomainLite,
  type CatalogBrandLite,
  type CatalogModelLite,
  type CatalogProblemLite,
} from '@/lib/api/catalog-service';

const STEPS = ['Votre appareil', 'Votre problème', 'Où et quand ?', 'Vérifiez et envoyez'];

const MIN_DESCRIPTION_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 1000;

const OTHER_DOMAIN = '__other__';

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
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [requestedMode, setRequestedMode] = useState<RequestTimingMode>('ASAP');
  const [requestedAt, setRequestedAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Appareil (catalogue) — source de vérité admin.
  const [domains, setDomains] = useState<CatalogDomainLite[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [domainId, setDomainId] = useState('');
  const [domainName, setDomainName] = useState('');
  const [brandId, setBrandId] = useState('');
  const [modelId, setModelId] = useState('');
  const [problemId, setProblemId] = useState('');
  const [brands, setBrands] = useState<CatalogBrandLite[]>([]);
  const [models, setModels] = useState<CatalogModelLite[]>([]);
  const [problems, setProblems] = useState<CatalogProblemLite[]>([]);

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
    const problem = problems.find((p) => p.id === problemId);
    if (problem) parts.push(problem.name);
    return parts.join(' — ');
  }, [domainName, brands, brandId, models, modelId, problems, problemId]);

  const locationLabel = useMemo(
    () => [city.trim(), neighborhood.trim(), address.trim(), landmark.trim()].filter(Boolean).join(' — '),
    [city, neighborhood, address, landmark],
  );

  const canContinue = useMemo(() => {
    if (step === 0) return domainId !== '';
    if (step === 1) return description.trim().length >= MIN_DESCRIPTION_LENGTH;
    if (step === 2) return city.trim() !== '' && (requestedMode === 'ASAP' || requestedAt !== '');
    return true;
  }, [step, domainId, description, city, requestedMode, requestedAt]);

  const loadProblems = async (newBrandId: string, newModelId: string) => {
    if (!domainId) {
      setProblems([]);
      return;
    }
    try {
      const list = await listCatalogProblems(
        domainId,
        newBrandId || undefined,
        newModelId || undefined,
      );
      setProblems(list);
    } catch {
      setProblems([]);
    }
  };

  const handleDomainChange = (id: string) => {
    setDomainId(id);
    setBrandId('');
    setModelId('');
    setProblemId('');
    setBrands([]);
    setModels([]);
    setProblems([]);
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
      loadProblems(id, '');
    }
  };

  const handleBrandChange = (id: string) => {
    setBrandId(id);
    setModelId('');
    setProblemId('');
    setModels([]);
    if (id) {
      listCatalogModels(id)
        .then(setModels)
        .catch(() => setModels([]));
    }
    void loadProblems(id, '');
  };

  const handleModelChange = (id: string) => {
    setModelId(id);
    setProblemId('');
    void loadProblems(brandId, id);
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

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    const hasDevice = domainId !== '' && domainId !== OTHER_DOMAIN;
    try {
      const result = await createDemande({
        categoryId: categoryId || 'autre',
        description: description.trim(),
        medias: [],
        city: city.trim(),
        neighborhood: neighborhood.trim() || undefined,
        address: address.trim() || undefined,
        landmark: landmark.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        requestedMode,
        requestedAt: requestedAtIso ?? undefined,
        domainId: hasDevice && domainId ? domainId : undefined,
        brandId: hasDevice && brandId ? brandId : undefined,
        modelId: hasDevice && modelId ? modelId : undefined,
        problemId: hasDevice && problemId ? problemId : undefined,
      });
      router.push(
        `/client/confirmation?ref=${encodeURIComponent(result.reference)}&id=${encodeURIComponent(
          result.id,
        )}&mode=${encodeURIComponent(requestedMode)}&req=${encodeURIComponent(requestedAtIso ?? '')}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue. Réessayez.');
      setIsSubmitting(false);
    }
  };

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
        description={description.trim()}
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
                      <div key={index} className="h-28 animate-pulse rounded-xl border border-border bg-muted" />
                    ))}
                  </div>
                ) : domains.length === 0 ? (
                  <EmptyState
                    icon={<Icon name="wrench" size="md" />}
                    title="Catalogue indisponible"
                    description="Le catalogue n'est pas encore publié. Déposez quand même votre demande, un technicien vous la décrira."
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
                          description: 'Passez au problème directement, le technicien s’en occupera.',
                        }}
                      />
                    ) : null}

                    <DeviceChips
                      label="Quel est votre problème ?"
                      chips={problems.map((problem) => ({ id: problem.id, label: problem.name }))}
                      selectedId={problemId}
                      onSelect={setProblemId}
                      empty={{
                        icon: 'search',
                        title: 'Aucun problème répertorié',
                        description: 'Décrivez votre panne à l’étape suivante, le technicien la verra directement.',
                      }}
                    />
                  </div>
                ) : null}

                {domainId === OTHER_DOMAIN ? (
                  <Alert variant="neutral" dense icon="info">
                    Décrivez votre panne à l&apos;étape suivante : le technicien la verra directement.
                  </Alert>
                ) : null}
              </section>
            ) : null}

            {step === 1 ? (
              <section className="space-y-5" aria-label="Votre problème">
                <Field
                  label="Décrivez le problème *"
                  htmlFor="demande-description"
                  hint={`${description.trim().length} / ${MAX_DESCRIPTION_LENGTH} caractères`}
                  error={
                    description.trim().length > 0 && description.trim().length < MIN_DESCRIPTION_LENGTH
                      ? `Minimum ${MIN_DESCRIPTION_LENGTH} caractères (${description.trim().length} actuellement).`
                      : null
                  }
                >
                  <Textarea
                    id="demande-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex. : l’écran ne s’allume plus et le téléphone vibre parfois sans raison…"
                    rows={5}
                    maxLength={MAX_DESCRIPTION_LENGTH}
                  />
                </Field>
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
                    label="Description"
                    value={description.trim()}
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
              </section>
            ) : null}
          </div>

          <div className="flex items-center gap-3 pt-1">
            {step > 0 ? (
              <Button type="button" variant="secondary" onClick={goBack} disabled={isSubmitting}>
                Retour
              </Button>
            ) : null}

            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={goNext} disabled={!canContinue} className="flex-1">
                Continuer
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} isLoading={isSubmitting} className="flex-1" size="lg">
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
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
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

function StepProgress({ current, labels }: { current: number; labels: string[] }) {
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
        <div className="animate-sheen absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-50" />
      </div>
      <ol className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Étapes">
        {labels.map((label, index) => (
          <li
            key={label}
            className={cn(
              'text-[10px] font-medium sm:text-xs',
              index <= current ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>
    </div>
  );
}

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
    { icon: 'file', label: 'Problème', value: description || 'À décrire', step: 1 },
    { icon: 'pin', label: 'Localisation', value: location || 'À préciser', step: 2 },
    { icon: 'clock', label: 'Quand', value: timing, step: 2 },
  ];
  return (
    <aside className="sticky top-14 z-10" aria-label="Récapitulatif de la demande">
      <Card className="overflow-hidden shadow-float">
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3.5 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Récap</p>
          <span className="text-[10px] text-muted-foreground">mis à jour en direct</span>
        </div>
        <div className="divide-y divide-border/70 px-3.5 py-1">
          {rows.map((row) => (
            <button
              key={row.label}
              type="button"
              onClick={() => onEdit(row.step)}
              className="group flex w-full items-center gap-2.5 py-1.5 text-left"
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