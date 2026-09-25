import Link from 'next/link';
import { cn } from '@/lib/cn';
import { siteConfig } from '@/lib/site-config';
import { Logo } from '@/components/ui/logo';

interface BrandLogoProps {
  href?: string;
  showText?: boolean;
  className?: string;
}

/* Identité Relio : logo vectoriel « Reli » + pin orange (composant `Logo`
 * inline, adaptatif clair/sombre). `showText=false` n'affiche que le pin. */
export function BrandLogo({ href = '/', showText = true, className }: BrandLogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      aria-label={`${siteConfig.name} — retour à l’accueil`}
    >
      <Logo variant={showText ? 'full' : 'icon'} className="h-9 w-auto" />
    </Link>
  );
}
