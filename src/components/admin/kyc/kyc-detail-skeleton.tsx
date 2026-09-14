import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';

export function KycDetailSkeleton() {
  return (
    <div className="space-y-5" role="status">
      <span className="sr-only">Chargement du dossier…</span>
      <Skeleton className="h-5 w-1/3" />
      <div className="h-44 rounded-3xl bg-muted/50" />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}