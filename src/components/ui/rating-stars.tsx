import { cn } from '@/lib/cn';
import { Icon } from './icon';

export type StarRatingSize = 'sm' | 'md' | 'lg';

const starSizes: Record<StarRatingSize, string> = {
  sm: 'size-3.5',
  md: 'size-4.5',
  lg: 'size-5',
};

export interface RatingStarsProps {
  value: number | null;
  size?: StarRatingSize;
  showValue?: boolean;
  className?: string;
}

export function RatingStars({ value, size = 'md', showValue = false, className }: RatingStarsProps) {
  const displayValue = value == null ? 0 : Math.max(0, Math.min(5, value));
  return (
    <span className={cn('inline-flex items-center gap-1', className)} role="img" aria-label={value == null ? 'Pas encore d’avis' : `Note : ${value.toLocaleString('fr-FR')} sur 5`}>
      <span className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => {
          const fill = Math.max(0, Math.min(1, displayValue - (i - 1)));
          return (
            <span key={i} className="relative inline-flex">
              <Icon name="star" className={cn('size-4.5 text-muted-foreground/40', starSizes[size])} />
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Icon name="star" filled className={cn('text-amber-500', starSizes[size])} />
              </span>
            </span>
          );
        })}
      </span>
      {showValue ? (
        <span className="text-sm font-medium text-foreground">
          {value == null ? '—' : value.toLocaleString('fr-FR')}
        </span>
      ) : null}
    </span>
  );
}