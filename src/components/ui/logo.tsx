import { useId } from 'react';
import { cn } from '@/lib/cn';
import { siteConfig } from '@/lib/site-config';

export type LogoVariant = 'full' | 'icon';

/**
 * Couleur FORCÉE du texte du wordmark.
 *
 * Par défaut (non renseigné) la couleur suit le thème via `currentColor` +
 * `dark:`, exactement comme le reste du design system. `tone` n'est utile que
 * pour les surfaces qui ne correspondent pas au thème (carte sombre dans un
 * thème clair, etc.). Le pin orange n'est JAMAIS affecté : il est toujours
 * orange, quelle que soit la tone.
 */
export type LogoTone = 'light' | 'dark';

export interface LogoProps {
  /** `full` = wordmark « Reli » + pin ; `icon` = pin seul. */
  variant?: LogoVariant;
  /**
   * Hauteur du logo en pixels. Quand elle est renseignée, elle prime sur la
   * hauteur définie par `className` (sinon les deux se disputeraient).
   */
  size?: number;
  /** Forcer la couleur du texte. `undefined` = suivi automatique du thème. */
  tone?: LogoTone;
  className?: string;
}

/* ── Géométrie du pin (forme canonique) ────────────────────────────────────
 *
 * Le pin est la lettre « o » du mot « Relio ». Sa forme est defined une seule
 * fois (`PIN_BODY`) et sert aux DEUX variantes : seule sa mise à l'échelle
 * change.
 *
 * Boîte englobante du chemin, en coordonnées locales :
 *   x : 724 → 984   (largeur 260)
 *   y : 42  → 334   (hauteur 292)
 *
 * Le trou est transparent (`evenodd`) et le point central est orange : la
 * forme reste lisible sur fond clair comme sur fond sombre.
 */
const PIN_BODY =
  'M854 42C777 42 724 98 724 169C724 246 854 334 854 334C854 334 984 246 984 169C984 98 931 42 854 42Z M797 164a57 57 0 1 0 114 0a57 57 0 1 0-114 0Z';

/** Dégradé du pin : ambre → orange → orange soutenu. */
function PinGradient({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0.85" y2="1">
        <stop offset="0%" stopColor="#FB923C" />
        <stop offset="58%" stopColor="#F97316" />
        <stop offset="100%" stopColor="#EA580C" />
      </linearGradient>
    </defs>
  );
}

/** Classes de couleur du texte selon la tone forcée (défaut : auto). */
function textClass(tone: LogoTone | undefined): string {
  if (tone === 'light') return 'text-relio-bg';
  if (tone === 'dark') return 'text-white';
  return 'text-relio-bg dark:text-white';
}

/** Style inline : la hauteur en px prime sur la classe Tailwind. */
function sizeStyle(size: number | undefined): { height: string } | undefined {
  return size === undefined ? undefined : { height: `${size}px` };
}

/* ── Wordmark « Relio » ────────────────────────────────────────────────────
 *
 * LE POINT DÉLICAT : le pin doitvenir IMMÉDIATEMENT après le « i », avec un
 * espacement cohérent. Positionner le pin à une coordonnée fixe après un
 * `<text>` SVG est fragile : la largeur rendue de « Reli » dépend de la
 * police réellement disponible (Arial, Helvetica ou un fallback), donc le pin
 * se retrouverait plus ou moins loin du mot — c'est exactement le défaut
 * observé avant cette correction (pin décollé à ~200 px du texte).
 *
 * `textLength` + `lengthAdjust` fixent la largeur AVANCÉE du texte de façon
 * déterministe, quel que soit le rendu : le pin peut ensuite être positionné
 * sur une coordonnée fiable. `spacingAndGlyphs` est préféré à `spacing` car
 * il garantit la largeur cible même si la police de repli est sensiblement
 * différente.
 */
export function Logo({ variant = 'full', size, tone, className }: LogoProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gradientId = `relio-pin-${uid}`;

  if (variant === 'icon') {
    return (
      <svg
        viewBox="704 22 300 332"
        role="img"
        aria-label={siteConfig.name}
        style={sizeStyle(size)}
        className={cn('h-8 w-auto', className)}
      >
        <PinGradient id={gradientId} />
        <path d={PIN_BODY} fill={`url(#${gradientId})`} fillRule="evenodd" />
        <circle cx="854" cy="164" r="20" fill="#FB923C" />
      </svg>
    );
  }

  return (
    <svg
      /* Cadre resserré sur le contenu réel (texte + pin) : le ratio est passé
       * de 3.33 à 2.58, donc à hauteur égale le logo occupe MOINS de largeur
       * et la hauteur de capitale est plus grande qu'avant (20 px au lieu de
       * 16 px pour `h-8`). */
      viewBox="0 0 643 250"
      role="img"
      aria-label={siteConfig.name}
      style={sizeStyle(size)}
      className={cn('h-8 w-auto', textClass(tone), className)}
    >
      <PinGradient id={gradientId} />

      <text
        x="40"
        y="212"
        fill="currentColor"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="220"
        fontWeight="700"
        letterSpacing="-8"
        /* Largeur avancée forcée → le pin se place toujours juste après. */
        textLength="400"
        lengthAdjust="spacingAndGlyphs"
      >
        Reli
      </text>

      {/* Pin = lettre « o ».
       *
       * Échelle UNIFORME 0.565 (proportions naturelles préservées, aucune
       * déformation) et translation calculée pour que le pin :
       *   - commence en x = 456, soit 16 px après la fin du texte (x = 440),
       *     un intervalle comparable à l'entrelettre du mot ;
       *   - pose exactement SUR la ligne de base (y = 212), comme une lettre ;
       *   - culmine à y = 47, légèrement au-dessus des capitales (y ≈ 72),
       *     ce qui donne au pin la présence nécessaire pour remplacer un « o »
       *     sans écraser les lettres qui le précèdent. */}
      <g transform="translate(46.9 23.3) scale(0.565)">
        <path d={PIN_BODY} fill={`url(#${gradientId})`} fillRule="evenodd" />
        <circle cx="854" cy="164" r="20" fill="#FB923C" />
      </g>
    </svg>
  );
}