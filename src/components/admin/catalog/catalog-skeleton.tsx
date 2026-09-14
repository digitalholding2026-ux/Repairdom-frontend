import { SkeletonCard } from '@/components/ui/skeleton';

export function CatalogSkeleton() {
  return (
    <div className="space-y-3" role="status">
      <span className="sr-only">Chargement du catalogue…</span>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}