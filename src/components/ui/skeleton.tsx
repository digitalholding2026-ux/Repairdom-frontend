import { cn } from '@/lib/cn';

export interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'relative overflow-hidden rounded-md bg-muted',
        'after:absolute after:inset-y-0 after:left-0 after:w-full after:animate-[shimmer_1.6s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent',
        className,
      )}
    />
  );
}

/** Carte squelette (avatar + lignes) pour écrans listes/dashboards. */
export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn('space-y-3 rounded-xl border border-border bg-card p-4 shadow-card', className)}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

/** Ligne squelette (avatar + texte) pour listes de notifications / missions. */
export function SkeletonRow({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn('flex items-start gap-3 rounded-xl border border-border bg-card p-3 shadow-card', className)}
    >
      <Skeleton className="size-9 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}