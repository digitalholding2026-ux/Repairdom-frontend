import { Skeleton } from '@/components/ui/skeleton';

export function ParrainageSkeleton() {
  return (
    <div className="space-y-6" role="status">
      <span className="sr-only">Chargement…</span>
      <div className="h-44 rounded-3xl bg-muted/50" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}