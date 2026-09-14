import { SkeletonRow } from '@/components/ui/skeleton';

export function KycListSkeleton() {
  return (
    <div className="space-y-3" role="status">
      <span className="sr-only">Chargement des dossiers…</span>
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </div>
  );
}