import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/cn';
import { siteConfig } from '@/lib/site-config';

interface BrandLogoProps {
  href?: string;
  showText?: boolean;
  className?: string;
}

/* Identité Relio : logotype officiel (public/brand/relio-logo.png, copie à
 * l'octet de logo/Relio-removebg-preview.png, version transparente). Le PNG
 * conservant son canal alpha, aucun fond ni pastille n'est ajouté :
 * rendu propre en mode clair comme en dark-mode. `showText` est conservé
 * pour la compatibilité des appelants ; le visuel contient déjà le nom. */
export function BrandLogo({ href = '/', className }: BrandLogoProps) {
  return (
    <Link
      href={href}
      className={cn('flex items-center', className)}
      aria-label={`${siteConfig.name} — retour à l’accueil`}
    >
      <Image
        src="/brand/relio-logo.png"
        alt={siteConfig.name}
        width={96}
        height={64}
        className="h-9 w-auto"
        priority
      />
    </Link>
  );
}