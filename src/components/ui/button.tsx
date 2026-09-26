'use client';

import type { ButtonHTMLAttributes, MouseEvent } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './spinner';
import { triggerHaptic } from '@/lib/haptics';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium ' +
  'transition-[transform,background-color,color,border-color,opacity] duration-150 ' +
  'focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
  'disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98]';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-[#F97316] text-primary-foreground shadow-md shadow-[#F97316]/20 hover:bg-[#FB923C]',
  secondary: 'bg-secondary text-secondary-foreground hover:opacity-90',
  ghost: 'text-foreground hover:bg-muted',
  destructive: 'bg-destructive text-error-foreground hover:opacity-90',
  outline: 'border border-border bg-card text-foreground hover:bg-muted',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'h-10 w-10',
};

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  onClick,
  ...props
}: ButtonProps) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !isLoading) triggerHaptic();
    onClick?.(e);
  };
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      onClick={handleClick}
      {...props}
    >
      {isLoading ? <Spinner size="sm" /> : null}
      {children}
    </button>
  );
}