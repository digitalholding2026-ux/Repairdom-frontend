import { Skeleton } from '@/components/ui/skeleton';

export function TechnicianHistorySkeleton() {
  return (
    <div className="space-y-6" role="status">
      <span className="sr-only">Chargement…</span>
      <div className="grid grid-cols-2 gap-2.5">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
    </div>
  );
}