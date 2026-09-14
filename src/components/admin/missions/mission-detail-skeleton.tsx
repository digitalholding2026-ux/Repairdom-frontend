import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';

export function MissionDetailSkeleton() {
  return (
    <div className="space-y-5" role="status">
      <span className="sr-only">Chargement de la mission…</span>
      <Skeleton className="h-5 w-1/3" />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}