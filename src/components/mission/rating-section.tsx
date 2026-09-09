'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RatingForm } from './rating-form';
import {
  createDemandeReview,
  fullName,
  listDemandeReviews,
  reviewDateTime,
  type Review,
} from '@/lib/api/review-service';

export interface RatingSectionProps {
  demandeId: string;
  title: string;
  alreadyRatedLabel: string;
}

export function RatingSection({ demandeId, title, alreadyRatedLabel }: RatingSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [mine, setMine] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await listDemandeReviews(demandeId);
      setReviews(data.reviews);
      setMine(data.mine);
    } catch {
      // Erreur silencieuse : les avis restent vides, l'utilisateur peut recharger la page.
    } finally {
      setLoading(false);
    }
  }, [demandeId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (rating: number, comment: string) => {
    await createDemandeReview(demandeId, { rating, comment });
  };

  const otherReviews = reviews.filter((review) => review.authorId !== mine?.authorId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Avis &amp; réputation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!loading ? (
          <RatingForm
            title={title}
            alreadyRated={mine !== null}
            alreadyRatedLabel={alreadyRatedLabel}
            onSubmit={handleSubmit}
            onRated={load}
          />
        ) : null}

        {otherReviews.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Évaluations publiées
            </h3>
            {otherReviews.map((review) => (
              <div
                key={review.id}
                className="space-y-1 rounded-lg border border-border bg-muted/50 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {fullName(review.author)}
                    <span className="ml-1.5 text-amber-500">
                      {'★'.repeat(review.rating)}
                      <span className="text-muted-foreground/40">
                        {'★'.repeat(5 - review.rating)}
                      </span>
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {reviewDateTime(review.createdAt)}
                  </span>
                </div>
                {review.comment ? (
                  <p className="whitespace-pre-line text-sm text-muted-foreground">
                    {review.comment}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}