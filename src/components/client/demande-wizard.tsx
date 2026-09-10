'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
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
    listCatalogDomains()
      .then((list) => {
        if (active) setDomains(list);
      })
      .catch(() => {
        if (active) setDomains([]);
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
    <Card>
      <CardContent className="space-y-5">
        <ol className="flex items-center gap-2" aria-label="Progression">
          {STEPS.map((label, index) => {
            const state =
              index < step ? 'done' : index === step ? 'current' : 'pending';
            return (
              <li key={label} className="flex flex-1 items-center gap-2">
                <span
                  aria-hidden
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                    state === 'done' && 'bg-primary text-primary-foreground',
                    state === 'current' && 'border-2 border-primary text-primary',
                    state === 'pending' && 'border border-border text-muted-foreground',
                  )}
                >
                  {state === 'done' ? (
                    <Icon name="check" size="sm" strokeWidth={2.5} />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={cn(
                    'hidden text-xs font-medium sm:block',
                    state === 'pending' ? 'text-muted-foreground' : 'text-foreground',
                  )}
                >
                  {label}
                </span>
                {index < STEPS.length - 1 ? (
                  <span aria-hidden className="h-px flex-1 bg-border" />
                ) : null}
              </li>
            );
          })}
        </ol>

        {step === 0 ? (
          <section className="space-y-5" aria-label="Votre appareil">
            <Field label="Quel appareil avez-vous ? *" htmlFor="device-domain">
              <Select
                id="device-domain"
                value={domainId}
                onChange={(e) => handleDomainChange(e.target.value)}
              >
                <option value="">— Choisir —</option>
                {domains.map((domain) => (
                  <option key={domain.id} value={domain.id}>
                    {domain.name}
                  </option>
                ))}
                <option value={OTHER_DOMAIN}>Mon appareil n&apos;est pas dans la liste</option>
              </Select>
            </Field>

            {domainId && domainId !== OTHER_DOMAIN ? (
              <div className="space-y-3 rounded-xl border border-border bg-card p-3">
                {domainId ? (
                  <Field label="Marque" htmlFor="device-brand" hint="Facultatif">
                    <Select
                      id="device-brand"
                      value={brandId}
                      onChange={(e) => handleBrandChange(e.target.value)}
                    >
                      <option value="">— Choisir —</option>
                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : null}

                {brandId ? (
                  <Field label="Modèle" htmlFor="device-model" hint="Facultatif">
                    <Select
                      id="device-model"
                      value={modelId}
                      onChange={(e) => handleModelChange(e.target.value)}
                    >
                      <option value="">— Choisir —</option>
                      {models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : null}

                {domainId ? (
                  <Field label="Quel est votre problème ?" htmlFor="device-problem" hint="Facultatif">
                    <Select
                      id="device-problem"
                      value={problemId}
                      onChange={(e) => setProblemId(e.target.value)}
                    >
                      <option value="">— Choisir —</option>
                      {problems.map((problem) => (
                        <option key={problem.id} value={problem.id}>
                          {problem.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : null}
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
                value={[
                  city.trim(),
                  neighborhood.trim(),
                  address.trim(),
                  landmark.trim(),
                ]
                  .filter(Boolean)
                  .join(' — ')}
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

        {error ? <Alert variant="error">{error}</Alert> : null}

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