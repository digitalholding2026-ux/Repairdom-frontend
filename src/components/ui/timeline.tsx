import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './icon';

export type TimelineStepState = 'done' | 'current' | 'pending';

export interface TimelineStep {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  timestamp?: ReactNode;
  icon?: IconName;
  state: TimelineStepState;
}

export interface TimelineProps {
  steps: TimelineStep[];
  className?: string;
}

export function Timeline({ steps, className }: TimelineProps) {
  return (
    <ol className={cn('space-y-0', className)}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const done = step.state === 'done';
        const current = step.state === 'current';
        return (
          <li key={step.id} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast ? (
              <span
                aria-hidden
                className={cn(
                  'absolute left-[13px] top-7 bottom-0 w-px',
                  done ? 'bg-success' : 'bg-border',
                )}
              />
            ) : null}
            <span
              aria-hidden
              className={cn(
                'relative z-10 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border',
                done && 'border-success bg-success text-success-foreground',
                current && 'border-primary bg-primary text-primary-foreground',
                step.state === 'pending' && 'border-border bg-card text-muted-foreground',
              )}
            >
              {step.icon ? (
                <Icon name={step.icon} className="size-4" strokeWidth={2.2} filled={done && step.icon === 'check'} />
              ) : done ? (
                <Icon name="check" className="size-4" strokeWidth={2.2} />
              ) : current ? (
                <span className="size-2 rounded-full bg-primary-foreground" />
              ) : (
                <span className="size-1.5 rounded-full bg-border" />
              )}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className={cn('text-sm font-medium', current && 'text-primary')}>{step.title}</p>
              {step.timestamp ? (
                <p className="mt-0.5 text-xs text-muted-foreground">{step.timestamp}</p>
              ) : null}
              {step.description ? (
                <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}