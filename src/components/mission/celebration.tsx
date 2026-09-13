import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/icon';

const CONFETTI_COLORS = [
  '#4f46e5',
  '#7c3aed',
  '#0ea5e9',
  '#059669',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
];

// Liste déterministe (aucun risque d'hydration mismatch, montée côté serveur comme client).
const CONFETTI_PIECES = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37 + (i % 5) * 4) % 100,
  delay: (i % 7) * 0.12,
  duration: 1.9 + ((i * 13) % 9) / 10,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  rotation: 160 + ((i * 97) % 240),
  driftX: ((i * 29) % 44) - 22,
  width: 6 + (i % 3) * 3,
  height: 9 + (i % 4) * 3,
}));

export interface CelebrationProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}

/** Bannière de succès avec pluie de confettis CSS (une seule passe, ~2 s). */
export function Celebration({ title, subtitle, children, className }: CelebrationProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-px shadow-float',
        className,
      )}
    >
      <div className="relative rounded-[calc(1rem-1px)] bg-emerald-50 px-5 py-6 dark:bg-emerald-950/50">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {CONFETTI_PIECES.map((piece, index) => (
            <span
              key={index}
              className="confetti-piece"
              style={
                {
                  left: `${piece.left}%`,
                  '--cf-x': `${piece.driftX}px`,
                  '--cf-r': `${piece.rotation}deg`,
                  '--cf-w': `${piece.width}px`,
                  '--cf-h': `${piece.height}px`,
                  '--cf-color': piece.color,
                  '--cf-delay': `${piece.delay}s`,
                  '--cf-dur': `${piece.duration}s`,
                } as CSSProperties
              }
            />
          ))}
        </div>

        <div className="relative animate-pop-in space-y-3 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-pop">
            <Icon name="check-circle" size="lg" strokeWidth={2.2} filled />
          </span>
          <div>
            <h3 className="text-lg font-bold tracking-tight">{title}</h3>
            {subtitle ? (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {children ? <div className="pt-1">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}