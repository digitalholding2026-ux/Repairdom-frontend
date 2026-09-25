'use client';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { BrandLogo } from '@/components/public/brand-logo';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
      <BrandLogo href="/" />
      <EmptyState
        title="Page introuvable"
        description="La page que vous cherchez n’existe pas ou a été déplacée. Votre session n’est pas affectée."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => (window.location.href = '/')}>Retour à l’accueil</Button>
            <Button variant="secondary" onClick={() => window.history.back()}>
              Page précédente
            </Button>
          </div>
        }
      />
    </div>
  );
}