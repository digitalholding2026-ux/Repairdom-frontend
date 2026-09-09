import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Label } from './label';

export interface FieldProps {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, hint, error, required, children, className }: FieldProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <Label htmlFor={htmlFor} className={cn(error && 'text-error-ink')}>
        {label}
        {required ? <span className="ml-0.5 text-error" aria-hidden> *</span> : null}
      </Label>
      {children}
      {error ? <p className="text-sm text-error-ink">{error}</p> : null}
      {!error && hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}