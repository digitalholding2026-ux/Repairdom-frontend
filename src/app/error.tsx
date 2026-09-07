'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

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
    <div className="flex min-h-dvh items-center justify-center px-4">
      <EmptyState
        title="Une erreur est survenue"
        description="Un problème inattendu a interrompu le chargement de la page."
        action={<Button onClick={reset}>Réessayer</Button>}
      />
    </div>
  );
}