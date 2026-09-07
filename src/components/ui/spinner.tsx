import { cn } from '@/lib/cn';

export interface SpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-8',
};

export function Spinner({ className, size = 'md' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Chargement"
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-current border-t-transparent',
        sizes[size],
        className,
      )}
    />
  );
}