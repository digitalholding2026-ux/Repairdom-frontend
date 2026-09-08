'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  type RequestMedia,
} from '@/lib/api/request-service';

const STEPS = ['Catégorie', 'Description', 'Médias', 'Localisation', 'Récapitulatif'];

const MIN_DESCRIPTION_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_MEDIA_FILES = 5;
const MAX_MEDIA_SIZE_BYTES = 25 * 1024 * 1024;
const ACCEPTED_MEDIA_TYPES = ['image/', 'video/', 'audio/'];

const STEP_DESCRIPTIONS = [
  'Choisissez le type de panne à dépanner.',
  'Décrivez le problème le plus précisément possible.',
  'Ajoutez des photos, vidéos ou un message audio (facultatif).',
  'Indiquez le lieu où nous devons intervenir.',
  'Vérifiez votre demande avant de l’envoyer.',
];

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

export function DemandeWizard() {
  const router = useRouter();
  const objectUrlsRef = useRef<string[]>([]);

  const [step, setStep] = useState(0);
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [medias, setMedias] = useState<RequestMedia[]>([]);
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, []);

  const canContinue = useMemo(() => {
    switch (step) {
      case 0:
        return categoryId !== '';
      case 1:
        return description.trim().length >= MIN_DESCRIPTION_LENGTH;
      case 2:
        return true;
      case 3:
        return city.trim() !== '';
      default:
        return true;
    }
  }, [step, categoryId, description, city]);

  const handleFilesChange = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setError(null);
    const pending: RequestMedia[] = [];

    Array.from(files).forEach((file) => {
      if (!ACCEPTED_MEDIA_TYPES.some((prefix) => file.type.startsWith(prefix))) {
        setError('Un ou plusieurs fichiers ne sont pas au bon format (image, vidéo ou audio).');
        return;
      }
      if (file.size > MAX_MEDIA_SIZE_BYTES) {
        setError('Un ou plusieurs fichiers dépassent la limite de 25 Mo.');
        return;
      }
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.push(url);
      pending.push({
        id: file.name + String(Date.now()),
        name: file.name,
        type: file.type,
        size: file.size,
        url,
      });
    });

    setMedias((prev) => [...prev, ...pending].slice(0, MAX_MEDIA_FILES));
  };

  const removeMedia = (id: string) => {
    setMedias((prev) => {
      const target = prev.find((m) => m.id === id);
      if (target) {
        URL.revokeObjectURL(target.url);
        objectUrlsRef.current = objectUrlsRef.current.filter((u) => u !== target.url);
      }
      return prev.filter((m) => m.id !== id);
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

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await createDemande({
        categoryId,
        description: description.trim(),
        medias: medias.map(({ name, type, size }) => ({ name, type, size })),
        city: city.trim(),
        address: address.trim() || undefined,
      });
      router.push(`/client/confirmation?id=${encodeURIComponent(result.id)}`);
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
            <input
              id="demande-medias"
              type="file"
              multiple
              accept="image/*,video/*,audio/*"
              onChange={(e) => {
                handleFilesChange(e.target.files);
                e.target.value = '';
              }}
              className="sr-only"
            />
            <label
              htmlFor="demande-medias"
              className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-muted/50 px-4 py-6 text-center transition-colors hover:bg-muted"
            >
              <span className="text-base font-medium">Ajouter un fichier</span>
              <span className="text-xs text-muted-foreground">
                Photos, vidéos ou audio — jusqu’à {MAX_MEDIA_FILES} fichiers de 25 Mo max.
              </span>
            </label>

            {medias.length > 0 ? (
              <ul className="space-y-2">
                {medias.map((media) => (
                  <li key={media.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-2.5">
                    {media.type.startsWith('image/') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={media.url}
                        alt={media.name}
                        className="h-12 w-12 shrink-0 rounded-md object-cover"
                      />
                    ) : media.type.startsWith('video/') ? (
                      <video src={media.url} className="h-12 w-12 shrink-0 rounded-md object-cover" />
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold">
                        Audio
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{media.name}</p>
                      <p className="text-xs text-muted-foreground">{formatSize(media.size)}</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeMedia(media.id)}>
                      Retirer
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {step === 3 ? (
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

        {step === 4 ? (
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
            <SummaryRow
              label="Médias"
              value={medias.length === 0 ? 'Aucun fichier' : `${medias.length} fichier(s)`}
              onEdit={() => jumpTo(2)}
            />
            <SummaryRow label="Localisation" value={location.address ? `${location.city} — ${location.address}` : location.city} onEdit={() => jumpTo(3)} />
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