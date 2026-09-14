import { Skeleton } from '@/components/ui/skeleton';

export function ProfilSkeleton() {
  return (
    <div className="space-y-6" role="status">
      <span className="sr-only">Chargement…</span>

      {/* Hero skeleton */}
      <div className="h-40 rounded-3xl bg-muted/50" />

      {/* Sections */}
      <div className="space-y-4">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-2/3" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-11 w-full" />
      </div>

      <Skeleton className="h-12 w-full" />
    </div>
  );
}
