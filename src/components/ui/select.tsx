import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './icon';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <span className="relative block">
      <select
        className={cn(
          'h-11 w-full appearance-none rounded-lg border border-border bg-card pl-3.5 pr-10 ' +
            'text-base text-foreground transition-colors focus-visible:outline-none ' +
            'focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <Icon
        name="chevron-down"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </span>
  );
}