import { Skeleton, SkeletonCard, SkeletonRow } from '@/components/ui/skeleton';
import { BrandLogo } from '@/components/public/brand-logo';

export default function Loading() {
  return (
    <div
      className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8"
      role="status"
    >
      <span className="sr-only">Chargement…</span>
      <BrandLogo href="/" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-3/5" />
      <SkeletonCard />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </div>
  );
}
