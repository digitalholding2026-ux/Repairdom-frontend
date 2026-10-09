'use client';

import { useEffect, useRef, useState, type ElementType } from 'react';

/* Apparition d'un bloc au scroll — composant client minimal : il ne décide que
 * QUAND un bloc devient visible, et confie cette décision à la feuille de style
 * par l'intermédiaire d'une classe. Durée, courbe d'accélération, distance de
 * parcours et option « moins de mouvements » vivent dans `globals.css` : rien
 * qui anime ne reside dans le JavaScript.
 *
 * Volontairement absent : toute boucle de rafraîchissement image par image,
 * tout minuteur, toute bibliothèque d'animation. Le mouvement appartient au
 * navigateur.
 */

interface Props {
  children: React.ReactNode;
  /** Attente avant l'apparition, en ms. Utilisé pour l'effet de cascade. */
  delay?: number;
  /** Classes additionnelles posées sur l'élément enveloppé. */
  className?: string;
  /** Balise rendue. `div` par défaut. */
  as?: ElementType;
}

export function AnimateOnScroll({
  children,
  delay = 0,
  className = '',
  as: Tag = 'div',
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    /* Un visiteur qui a demandé moins de mouvements ne doit voir AUCUNE
     * animation : le bloc est considéré visible dès le premier rendu, sans
     * observateur. L'observateur n'est même pas créé. */
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setVisible(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    /* L'observateur est débranché dès la première intersection : un bloc déjà
     * resté visible le reste. L'animation ne se rejoue pas au retour en haut
     * de page, et il ne reste rien à surveiller en mémoire. */
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`animate-on-scroll${visible ? ' is-visible' : ''}${className ? ` ${className}` : ''}
    `}
      style={delay > 0 ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}