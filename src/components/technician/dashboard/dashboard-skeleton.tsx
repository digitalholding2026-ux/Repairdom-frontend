import { Skeleton, SkeletonCard, SkeletonRow } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-5 py-2" role="status">
      <span className="sr-only">Chargement du tableau de bord…</span>

      {/* Hero skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-2/5" />
        <Skeleton className="h-4 w-3/5" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2.5">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>

      {/* Revenue card skeleton */}
      <Skeleton className="h-44 rounded-3xl" />

      {/* Quick actions */}
      <div className="flex justify-around">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <Skeleton className="size-12 rounded-2xl" />
            <Skeleton className="h-2.5 w-12" />
          </div>
        ))}
      </div>

      {/* Mission card skeleton */}
      <SkeletonCard />

      {/* List skeletons */}
      <div className="space-y-2.5">
        <Skeleton className="h-4 w-1/3" />
        <SkeletonRow />
        <SkeletonRow />
      </div>

      {/* Account skeleton */}
      <div className="space-y-2">
        <SkeletonCard />
      </div>
    </div>
  );
}
