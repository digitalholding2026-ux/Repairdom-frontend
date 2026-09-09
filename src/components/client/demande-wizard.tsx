'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/cn';
import { REQUEST_CATEGORIES } from '@/lib/data/request-categories';
import { formatRequestedTiming, type RequestTimingMode } from '@/lib/request-timing';
import { createDemande } from '@/lib/api/request-service';

const STEPS = ['Votre problème', 'Où et quand ?', 'Vérifiez et envoyez'];

const MIN_DESCRIPTION_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 1000;

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
  const [address, setAddress] = useState('');
  const [requestedMode, setRequestedMode] = useState<RequestTimingMode>('ASAP');
  const [requestedAt, setRequestedAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minRequestedAt = useMemo(() => nowLocalValue(), []);
  const requestedAtIso = useMemo(
    () => (requestedMode === 'SCHEDULED' && requestedAt ? new Date(requestedAt).toISOString() : null),
    [requestedMode, requestedAt],
  );

  const canContinue = useMemo(() => {
    if (step === 0) return categoryId !== '' && description.trim().length >= MIN_DESCRIPTION_LENGTH;
    if (step === 1) return city.trim() !== '' && (requestedMode === 'ASAP' || requestedAt !== '');
    return true;
  }, [step, categoryId, description, city, requestedMode, requestedAt]);

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
    try {
      const result = await createDemande({
        categoryId,
        description: description.trim(),
        medias: [],
        city: city.trim(),
        address: address.trim() || undefined,
        requestedMode,
        requestedAt: requestedAtIso ?? undefined,
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

  const selectedCategory = REQUEST_CATEGORIES.find((c) => c.id === categoryId);

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
          <section className="space-y-5" aria-label="Votre problème">
            <div className="space-y-2">
              <span className="block text-sm font-medium">Quel type de panne ? *</span>
              <div className="grid gap-2" role="radiogroup" aria-label="Catégorie de la panne">
                {REQUEST_CATEGORIES.map((category) => {
                  const selected = category.id === categoryId;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setCategoryId(category.id)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        selected
                          ? 'border-primary bg-secondary text-secondary-foreground'
                          : 'border-border bg-card text-foreground hover:bg-muted',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-full',
                          selected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        <Icon name="wrench" size="4.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{category.label}</span>
                        {category.description ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {category.description}
                          </span>
                        ) : null}
                      </span>
                      {selected ? (
                        <Icon name="check-circle" className="text-primary" filled />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

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
                placeholder="Ex. : ma chaudière ne s’allume plus et il y a une légère odeur de gaz…"
                rows={5}
                maxLength={MAX_DESCRIPTION_LENGTH}
              />
            </Field>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="space-y-5" aria-label="Où et quand ?">
            <Field label="Ville *" htmlFor="demande-city" hint="Ville où se déroule l’intervention.">
              <Input
                id="demande-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex. : Lyon"
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

        {step === 2 ? (
          <section className="space-y-4" aria-label="Vérification">
            <div className="space-y-2">
              {selectedCategory ? (
                <SummaryRow
                  icon="wrench"
                  label="Catégorie"
                  value={selectedCategory.label}
                  onEdit={() => jumpTo(0)}
                />
              ) : null}
              <SummaryRow
                icon="file"
                label="Description"
                value={description.trim()}
                onEdit={() => jumpTo(0)}
              />
              <SummaryRow
                icon="pin"
                label="Localisation"
                value={address.trim() ? `${city.trim()} — ${address.trim()}` : city.trim()}
                onEdit={() => jumpTo(1)}
              />
              <SummaryRow
                icon="clock"
                label="Moment souhaité"
                value={formatRequestedTiming(requestedMode, requestedAtIso)}
                onEdit={() => jumpTo(1)}
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
  icon: 'wrench' | 'file' | 'pin' | 'clock';
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