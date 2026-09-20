import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/cn';
import { siteConfig } from '@/lib/site-config';

interface BrandLogoProps {
  href?: string;
  showText?: boolean;
  className?: string;
}

/* Identité Relio : logotype officiel (public/brand/relio-logo.png, copié de
 * logo/Relio.png sans modification). `showText` est conservé pour la
 * compatibilité des appelants ; le visuel contient déjà le nom de marque. */
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