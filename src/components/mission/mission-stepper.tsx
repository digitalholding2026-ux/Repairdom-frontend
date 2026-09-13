import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/icon';
import {
  missionCurrentIndex,
  missionStepsFor,
  type MissionStepConfig,
} from '@/lib/mission-progress';

const toneDot: Record<MissionStepConfig['tone'], string> = {
  indigo: 'text-indigo-600',
  violet: 'text-violet-600',
  blue: 'text-sky-600',
  amber: 'text-amber-600',
  emerald: 'text-emerald-600',
};

export interface MissionStepperProps {
  status: string;
  currentHint?: string;
  className?: string;
}

/** Stepper vertical animé (façon Uber Eats) : les étapes réalisées passent en
 *  vert, l'étape en cours pulse avec son connecteur qui « grandit », le reste
 *  reste grisé. */
export function MissionStepper({ status, currentHint, className }: MissionStepperProps) {
  const steps = missionStepsFor(status);
  const currentIndex = missionCurrentIndex(status);
  if (currentIndex === -1) return null;

  return (
    <ol className={cn('space-y-0', className)}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const done = index < currentIndex;
        const current = index === currentIndex;
        const pending = index > currentIndex;

        return (
          <li key={step.key} className="relative flex gap-3 pb-4 last:pb-0">
            {!isLast ? (
              <span
                aria-hidden
                className="absolute left-[19px] top-8 bottom-0 w-0.5 overflow-hidden rounded-full bg-muted"
              >
                <span
                  className={cn(
                    'block w-full origin-top',
                    done ? 'bg-emerald-400' : current ? 'bg-gradient-to-b from-primary to-accent' : '',
                  )}
                  style={current ? { animation: 'connector-grow 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards' } : undefined}
                />
              </span>
            ) : null}

            <span
              aria-hidden
              className={cn(
                'relative z-10 mt-0.5 flex shrink-0 items-center justify-center rounded-full transition-all duration-500',
                done && 'size-7 bg-emerald-500 text-white shadow-sm',
                current && 'size-10 bg-primary text-primary-foreground ring-4 ring-primary/20 animate-pulse-dot shadow-pop',
                pending && 'size-7 bg-muted text-muted-foreground ring-1 ring-inset ring-border',
              )}
            >
              <Icon
                name={done ? 'check' : step.icon}
                size={current ? 'sm' : 'xs'}
                strokeWidth={2.4}
                filled={done}
              />
            </span>

            <div
              className={cn(
                'min-w-0 flex-1 rounded-xl transition-colors duration-500',
                current && 'border border-primary/15 bg-primary/[0.05] px-3.5 py-3',
              )}
            >
              <div className={cn('flex items-center justify-between gap-2', current && 'pt-0')}>
                <p
                  className={cn(
                    'text-sm font-semibold',
                    done && 'text-foreground',
                    current && 'text-primary',
                    pending && 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </p>
                {index < steps.length - 1 ? (
                  <span
                    className={cn(
                      'shrink-0 text-xs font-medium',
                      toneDot[step.tone],
                    )}
                  >
                    {done ? 'Terminé' : current ? 'En cours' : 'À venir'}
                  </span>
                ) : null}
              </div>
              {current && currentHint ? (
                <p className="mt-1 text-xs text-muted-foreground">{currentHint}</p>
              ) : null}
              {current ? (
                <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
                  </span>
                  Mise à jour en temps réel
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}