import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/cn';
import { siteConfig } from '@/lib/site-config';

interface BrandLogoProps {
  href?: string;
  showText?: boolean;
  className?: string;
}

/* Identité Relio (refonte vectorielle) : monogramme « R » gradient officiel
 * (#00AEEF → #8A2BE2) + wordmark. Version claire (marine) / sombre (blanc)
 * commutée en CSS — lisible dans les deux modes, sans slogan (réservé au
 * footer/landing). `showText` conservé pour compatibilité. */
export function BrandLogo({ href = '/', className }: BrandLogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      aria-label={`${siteConfig.name} — retour à l’accueil`}
    >
      <Image
        src="/brand/relio-logo-light.svg"
        alt={siteConfig.name}
        width={147}
        height={48}
        className="h-9 w-auto dark:hidden"
        priority
      />
      <Image
        src="/brand/relio-logo-dark.svg"
        alt={siteConfig.name}
        width={147}
        height={48}
        className="hidden h-9 w-auto dark:block"
        priority
      />
    </Link>
  );
}
