import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/* Coque du dashboard technicien.
 *
 * POURQUOI UN COMPOSANT DÉDIÉ
 * Le fond sombre était posé sur le div racine du rendu FINAL seulement. Les
 * deux sorties anticipées — chargement et erreur — ne le portaient pas : au
 * premier rendu, l'écran était clair (`--color-background`), puis became sombre
 * une fois les données arrivées. Un Technicien en extérieur voit ce flash à
 * chaque ouverture.
 *
 * Une coque partagée rend l forgetting impossible : les trois états passent
 * par le même conteneur, donc aucun ne peut en être détaché par refactor.
 *
 * `min-h-dvh` et non `min-h-dvh` : sur mobile, les barres d'URL
 * rétractables réduisent la hauteur utile. `screen` vaut la hauteur la plus
 * haute, d'où un débordement et un espace mort au bas de l'écran.
 */
export function TechShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex min-h-dvh flex-col gap-6 rounded-3xl bg-relio-bg p-4 text-slate-100 sm:p-6',
        className,
      )}
    >
      {children}
    </div>
  );
}