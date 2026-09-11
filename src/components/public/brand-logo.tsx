import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/cn';
import { siteConfig } from '@/lib/site-config';

interface BrandLogoProps {
  href?: string;
  showText?: boolean;
  className?: string;
}

export function BrandLogo({ href = '/', showText = true, className }: BrandLogoProps) {
  return (
    <Link
      href={href}
      className={cn('flex items-center gap-2', className)}
      aria-label={`${siteConfig.name} — retour à l’accueil`}
    >
      <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Icon name="wrench" size="sm" strokeWidth={2.2} />
      </span>
      {showText ? (
        <span className="text-base font-bold tracking-tight">{siteConfig.name}</span>
      ) : null}
    </Link>
  );
}