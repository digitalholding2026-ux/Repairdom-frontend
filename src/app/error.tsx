'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { BrandLogo } from '@/components/public/brand-logo';

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
      <BrandLogo href="/" />
      <EmptyState
        title="Une erreur est survenue"
        description="Un problème inattendu a interrompu le chargement de la page. Votre compte n’est pas affecté."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={reset}>Réessayer</Button>
            <Button variant="secondary" onClick={() => (window.location.href = '/')}>
              Retour à l’accueil
            </Button>
          </div>
        }
      />
    </div>
  );
}