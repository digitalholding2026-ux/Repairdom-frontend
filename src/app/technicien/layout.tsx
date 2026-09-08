import type { ReactNode } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { siteConfig } from '@/lib/site-config';

export default function TechnicianLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur safe-top">
        <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between px-4">
          <Link href="/" className="text-base font-semibold tracking-tight">
            {siteConfig.name}
          </Link>
          <Badge variant="info">Espace technicien</Badge>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">{children}</main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground safe-bottom">
        <p>© {new Date().getFullYear()} {siteConfig.name}. Tous droits réservés.</p>
      </footer>
    </div>
  );
}