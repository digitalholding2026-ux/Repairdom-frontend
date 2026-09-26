'use client';

import { LottieSvg } from 'lottie-react';
import { technicianAnimation } from './register-technician-animation';

/* Player Lottie (moteur SVG allégé) : mallette + engrenage + étincelles.
 * Chargé avec `ssr: false` depuis `register-mascot` (le moteur accède au
 * DOM uniquement côté client). */
export default function TechnicianLottie({ className = '' }: { className?: string }) {
  return (
    <LottieSvg
      src={technicianAnimation}
      autoplay
      loop
      role="img"
      aria-label="Animation d'un technicien Relio : mallette d'outils et engrenage"
      className={className}
    />
  );
}
