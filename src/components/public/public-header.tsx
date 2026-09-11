import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BrandLogo } from './brand-logo';

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur safe-top">
      <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between gap-3 px-4">
        <BrandLogo href="/" />
        <nav className="flex items-center gap-2" aria-label="Navigation principale">
          <Link href="/client/connexion">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
              Connexion
            </Button>
          </Link>
          <Link href="/client/inscription">
            <Button size="sm" className="whitespace-nowrap">
              <span className="hidden sm:inline">J&apos;ai besoin d&apos;un dépannage</span>
              <span className="sm:hidden">Dépannage</span>
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}