import { Skeleton, SkeletonCard, SkeletonRow } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-4 px-4 py-6"
      role="status"
    >
      <span className="sr-only">Chargement…</span>
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-3/5" />
      <SkeletonCard />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </div>
  );
}