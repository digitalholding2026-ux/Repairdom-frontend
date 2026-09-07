import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className, type = 'text', ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        'h-11 w-full rounded-lg border border-border bg-card px-3.5 text-base text-foreground ' +
          'placeholder:text-muted-foreground transition-colors focus-visible:outline-none ' +
          'focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm',
        className,
      )}
      {...props}
    />
  );
}