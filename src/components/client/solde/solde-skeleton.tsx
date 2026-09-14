import { Skeleton, SkeletonCard, SkeletonRow } from '@/components/ui/skeleton';

export function SoldeSkeleton() {
  return (
    <div className="space-y-5 py-2" role="status">
      <span className="sr-only">Chargement du solde…</span>

      <div className="space-y-1">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      {/* Hero */}
      <Skeleton className="h-56 rounded-3xl" />

      {/* Banner */}
      <Skeleton className="h-16 rounded-2xl" />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2.5">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>

      {/* Chart */}
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-32 rounded-2xl" />

      {/* Missions */}
      <div className="space-y-2.5">
        <Skeleton className="h-4 w-1/2" />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Écritures */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    </div>
  );
}