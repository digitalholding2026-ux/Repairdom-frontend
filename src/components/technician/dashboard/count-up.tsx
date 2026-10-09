import { useEffect, useRef, useState } from 'react';

/* Compteur animé pour les valeurs monétaires des cartes KPI.
 *
 * POURQUOI
 * Un chiffre qui monte de 0 à sa valeur attire l'œil là où il compte —
 * c'est le chiffre du gains du mois, pas une décoration. L'effet est
 * volontairement bref : au-delà de ~700 ms il devient une attente.
 *
 * CE QUE CE N'EST PAS
 *   • pas une boucle infinie — le compteur s'arrête à la valeur finale ;
 *   • pas de décalage de mise en page — les chiffres sont tabulaires, donc
 *     « 12 500 » et « 0 » occupent la même place, et la largeur ne saute pas ;
 *   • pas une course à la valeur exacte si l'utilisateur a désactivé le
 *     mouvement : il affiche d'emblée le montant, sans interpolation.
 *
 * Implémentation : `requestAnimationFrame` natif, sans dépendance. L'animation
 * n'anime que l'opacité d'entrée — la valeur, elle, est recalculée à chaque
 * image, ce qui reste sous le seuil où un téléphone bas de gamut peine.
 */

const DURATION_MS = 600;

export function CountUp({
  value,
  format,
  className,
}: {
  /** Valeur cible — un nombre, pas une chaîne formatée. */
  value: number;
  /** Mise en forme de la valeur affichée. */
  format: (n: number) => string;
  className?: string;
}) {
  const [displayed, setDisplayed] = useState(value);
  const frame = useRef<number | null>(null);
  /* `target` en ref : l'effet ne se relance que sur changement de cible, et
   * ne captures donc pas une valeur périmée pendant l'animation. */
  const target = useRef(value);
  target.current = value;

  useEffect(() => {
    /* Pas d'animation si l'utilisateur l'a refusée : le montant s'affiche
     * tel quel. La boucle d'animation serait ici du pur gaspillage. */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayed(target.current);
      return;
    }

    const from = 0;
    const start = performance.now();

    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / DURATION_MS, 1);
      /* `easeOutCubic` : démarrage rapide, arrivée posée. Une courbe
       * linéaire fait lire le chiffre comme s'il coulait. */
      const eased = 1 - (1 - progress) ** 3;
      setDisplayed(from + (target.current - from) * eased);
      if (progress < 1) {
        frame.current = requestAnimationFrame(step);
      }
    };

    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [value]);

  return (
    <span className={className} aria-label={format(value)}>
      {/* Le nombre animé est `aria-hidden` : un lecteur d'écran qui suit le
          décompte image par image n'annonce pas une information, il en
          annonce trente. La valeur finale reste exposed via `aria-label`. */}
      <span aria-hidden className="tabular-nums">
        {format(displayed)}
      </span>
    </span>
  );
}