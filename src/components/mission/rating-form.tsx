'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export const REVIEW_COMMENT_MAX_LENGTH = 1000;

function StarSelector({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
          aria-pressed={value === star}
          onClick={(event) => {
            event.preventDefault();
            onChange(star);
          }}
          className="rounded text-2xl leading-none transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className={star <= value ? 'text-amber-400' : 'text-muted-foreground/40'}>
            ★
          </span>
        </button>
      ))}
    </div>
  );
}

export interface RatingFormProps {
  title: string;
  alreadyRated?: boolean;
  alreadyRatedLabel?: string;
  submitLabel?: string;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onRated?: () => void;
}

export function RatingForm({
  title,
  alreadyRated = false,
  alreadyRatedLabel = 'Vous avez déjà évalué cette intervention.',
  submitLabel = 'Envoyer mon avis',
  onSubmit,
  onRated,
}: RatingFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (alreadyRated) {
    return (
      <p className="rounded-lg border border-border bg-muted/50 px-3.5 py-2.5 text-sm text-muted-foreground">
        {alreadyRatedLabel}
      </p>
    );
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Veuillez choisir une note entre 1 et 5 étoiles.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      await onSubmit(rating, comment.trim());
      setSuccess(true);
      onRated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l’envoi de votre avis.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <StarSelector value={rating} onChange={setRating} />
      <Textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={REVIEW_COMMENT_MAX_LENGTH}
        rows={3}
        placeholder="Votre commentaire (facultatif)"
      />
      <p className="text-right text-xs text-muted-foreground">
        {comment.length}/{REVIEW_COMMENT_MAX_LENGTH}
      </p>
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      ) : null}
      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/30 dark:text-emerald-300">
          Merci ! Votre avis a bien été publié.
        </p>
      ) : null}
      <Button onClick={handleSubmit} isLoading={submitting} disabled={success} className="w-full">
        {submitLabel}
      </Button>
    </div>
  );
}