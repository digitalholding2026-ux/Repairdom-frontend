import { cn } from '@/lib/cn';

export interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'relative overflow-hidden rounded-md bg-muted',
        'after:absolute after:inset-y-0 after:left-0 after:w-full after:animate-[shimmer_1.6s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/40 after:to-transparent',
        className,
      )}
    />
  );
}