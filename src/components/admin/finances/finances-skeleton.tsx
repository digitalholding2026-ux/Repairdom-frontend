import { Skeleton, SkeletonRow } from '@/components/ui/skeleton';

export function FinancesSkeleton() {
  return (
    <div className="space-y-5" role="status">
      <span className="sr-only">Chargement des finances…</span>
      <div className="h-40 rounded-3xl bg-muted/50" />
      <Skeleton className="h-11 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-1/3" />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    </div>
  );
}