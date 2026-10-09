import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /**
   * Fond sur lequel le badge est posé.
   *
   * `light` (défaut) : le badge garde ses teintes de thème clair, Lynx, jaune…
   * `dark` : pour les écrans sombres (espace technicien). Les teintes claires
   * d'origine y sont illisibles — un voile `#ecfdf5` quasi blanc sur un fond
   * `#0b0d12` n'est pas un badge, c'est un bloc lumineux.
   *
   * OPT-IN VOLONTAIRE : ce badge est rendu dans 42 fichiers du dépôt. Faire du
   * sombre le défaut aurait repeint la moitié de la plateforme. Le défaut reste
   * donc `light`, et les usages sombres le demandent explicitement.
   */
  tone?: 'light' | 'dark';
}

const variants: Record<BadgeVariant, string> = {
  neutral: 'bg-muted text-muted-foreground',
  success: 'bg-success-soft text-success-ink',
  warning: 'bg-warning-soft text-warning-ink',
  danger: 'bg-error-soft text-error-ink',
  info: 'bg-info-soft text-info-ink',
  outline: 'border border-border bg-card text-muted-foreground',
};

/* Écrans sombres : voile teinte à 15 %, encre à 300 (mesurée à plus de 7:1 sur
 * `relio-card`). Le taux reste volontairement faible — sur un fond déjà sombre,
 * un voile plus dense fait « pastille » plutôt que « étiquette ». */
const darkVariants: Record<BadgeVariant, string> = {
  neutral: 'bg-white/8 text-relio-muted',
  success: 'bg-emerald-400/15 text-emerald-300',
  warning: 'bg-amber-400/15 text-amber-300',
  danger: 'bg-red-400/15 text-red-300',
  info: 'bg-sky-400/15 text-sky-300',
  outline: 'border border-relio-border bg-white/5 text-relio-muted',
};

export function Badge({ className, variant = 'neutral', tone = 'light', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        tone === 'dark' ? darkVariants[variant] : variants[variant],
        className,
      )}
      {...props}
    />
  );
}