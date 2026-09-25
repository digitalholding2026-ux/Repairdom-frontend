import { useId } from 'react';
import { cn } from '@/lib/cn';
import { siteConfig } from '@/lib/site-config';

export type LogoVariant = 'full' | 'icon';

export interface LogoProps {
  variant?: LogoVariant;
  className?: string;
}

/* Logo vectoriel Relio : wordmark « Reli » + pin orange en guise de « o ».
 * SVG inline : le texte hérite de `currentColor` (thème clair/sombre via
 * les classes `text-*`), le trou du pin est transparent (evenodd) — une
 * seule variante fonctionne sur fond clair comme sombre. Le pin seul
 * (`variant="icon"`) est 100 % orange, donc indépendant du thème. */
const PIN_BODY =
  'M854 42C777 42 724 98 724 169C724 246 854 334 854 334C854 334 984 246 984 169C984 98 931 42 854 42Z M797 164a57 57 0 1 0 114 0a57 57 0 1 0-114 0Z';

function PinGradient({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0.85" y2="1">
        <stop offset="0%" stopColor="#FF9500" />
        <stop offset="58%" stopColor="#FF6A00" />
        <stop offset="100%" stopColor="#FF4D00" />
      </linearGradient>
    </defs>
  );
}

export function Logo({ variant = 'full', className }: LogoProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gradientId = `relio-pin-${uid}`;

  if (variant === 'icon') {
    return (
      <svg
        viewBox="704 22 300 332"
        role="img"
        aria-label={siteConfig.name}
        className={cn('h-8 w-auto', className)}
      >
        <PinGradient id={gradientId} />
        <path d={PIN_BODY} fill={`url(#${gradientId})`} fillRule="evenodd" />
        <circle cx="854" cy="164" r="20" fill="#FF8A00" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 1200 360"
      role="img"
      aria-label={siteConfig.name}
      className={cn('h-8 w-auto text-[#0F1B3D] dark:text-white', className)}
    >
      <PinGradient id={gradientId} />
      <text
        x="54"
        y="266"
        fill="currentColor"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="258"
        fontWeight="700"
        letterSpacing="-12"
      >
        Reli
      </text>
      <path d={PIN_BODY} fill={`url(#${gradientId})`} fillRule="evenodd" />
      <circle cx="854" cy="164" r="20" fill="#FF8A00" />
    </svg>
  );
}
