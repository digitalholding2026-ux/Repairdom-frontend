import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Fond sur lequel la carte est posée.
   *
   * `light` (défaut) : surface verre claire, inchangée.
   * `dark` : pour les écrans sombres (espace technicien) — surface pleine
   * `relio-card`, bordure translucide. La surface translucide du thème clair
   * repose sur un fond clair : posée sur du nuit, elle n'est plus une surface
   * mais un voile.
   *
   * OPT-IN VOLONTAIRE : 43 fichiers rendent `Card`. Le sombre ne peut pas
   * devenir le défaut. Voir `Badge` pour la même raison.
   */
  tone?: 'light' | 'dark';
}

export function Card({ className, tone = 'light', ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg text-card-foreground motion-safe:animate-float-wave',
        tone === 'dark'
          ? 'border border-relio-border bg-relio-card'
          : 'glass-card hover:shadow-lg',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 p-4 sm:p-5', className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn('text-base font-semibold leading-tight sm:text-lg', className)} {...props} />
  );
}

export function CardDescription({
  className,
  tone = 'light',
  ...props
}: HTMLAttributes<HTMLParagraphElement> & { tone?: 'light' | 'dark' }) {
  return (
    <p
      className={cn('text-sm', tone === 'dark' ? 'text-relio-muted' : 'text-muted-foreground', className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-4 pb-4 sm:px-5 sm:pb-5', className)} {...props} />;
}