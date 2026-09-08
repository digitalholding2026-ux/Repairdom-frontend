'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/cn';
import { REQUEST_CATEGORIES } from '@/lib/data/request-categories';
import {
  createDemande,
  type RequestLocation,
} from '@/lib/api/request-service';

const STEPS = ['Catégorie', 'Description', 'Localisation', 'Récapitulatif'];

const MIN_DESCRIPTION_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 1000;

const STEP_DESCRIPTIONS = [
  'Choisissez le type de panne à dépanner.',
  'Décrivez le problème le plus précisément possible.',
  'Indiquez le lieu où nous devons intervenir.',
  'Vérifiez votre demande avant de l’envoyer.',
];

export function DemandeWizard() {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = useMemo(() => {
    switch (step) {
      case 0:
        return categoryId !== '';
      case 1:
        return description.trim().length >= MIN_DESCRIPTION_LENGTH;
      case 2:
        return city.trim() !== '';
      default:
        return true;
    }
  }, [step, categoryId, description, city]);

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
      });
      router.push(`/client/confirmation?ref=${encodeURIComponent(result.reference)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue. Réessayez.');
      setIsSubmitting(false);
    }
  };

  const selectedCategory = REQUEST_CATEGORIES.find((c) => c.id === categoryId);

  const location: RequestLocation = {
    city,
    address: address.trim() || undefined,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{STEPS[step]}</CardTitle>
        <CardDescription>{STEP_DESCRIPTIONS[step]}</CardDescription>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Étape {step + 1} sur {STEPS.length}
            </span>
            <span>{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {step === 0 ? (
          <div className="grid gap-3" role="radiogroup" aria-label="Catégorie de la panne">
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
                    'rounded-lg border p-3.5 text-left transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected
                      ? 'border-primary bg-secondary text-secondary-foreground'
                      : 'border-border bg-card text-foreground hover:bg-muted',
                  )}
                >
                  <span className="block text-sm font-semibold">{category.label}</span>
                  {category.description ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {category.description}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-3">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex. : ma chaudière ne s’allume plus et il y a une légère odeur de gaz…"
              rows={6}
              maxLength={MAX_DESCRIPTION_LENGTH}
              aria-label="Description du problème"
            />
            <div className="text-right text-xs text-muted-foreground">
              <span
                className={cn(
                  description.trim().length >= MIN_DESCRIPTION_LENGTH
                    ? 'font-medium text-emerald-600 dark:text-emerald-400'
                    : undefined,
                )}
              >
                {description.trim().length} / {MAX_DESCRIPTION_LENGTH} caractères
              </span>
              {description.trim().length < MIN_DESCRIPTION_LENGTH ? (
                <span className="ml-2">(minimum {MIN_DESCRIPTION_LENGTH})</span>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Ville *</span>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex. : Lyon"
                autoComplete="address-level2"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Adresse précise (facultatif)</span>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex. : 12 rue des Lilas, 3e étage"
                autoComplete="street-address"
              />
            </label>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <SummaryRow
              label="Catégorie"
              value={selectedCategory ? selectedCategory.label : ''}
              onEdit={() => jumpTo(0)}
            />
            <SummaryRow
              label="Description"
              value={description.trim()}
              onEdit={() => jumpTo(1)}
            />
            <SummaryRow label="Localisation" value={location.address ? `${location.city} — ${location.address}` : location.city} onEdit={() => jumpTo(2)} />
          </div>
        ) : null}

        <div className="mt-6 flex items-center gap-3">
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
            <Button
              type="button"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              className="flex-1"
            >
              Envoyer la demande
            </Button>
          )}
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface SummaryRowProps {
  label: string;
  value: string;
  onEdit: () => void;
}

function SummaryRow({ label, value, onEdit }: SummaryRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm whitespace-pre-line">{value}</p>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
        Modifier
      </Button>
    </div>
  );
}