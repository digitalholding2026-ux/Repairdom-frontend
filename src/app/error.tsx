'use client';

import { useEffect, useState } from 'react';
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
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  /* Chantier « régression 4-A » — une exception de rendu produisait un écran
   * muet : ni message, ni trace, impossible de distinguer un hook ordering
   * d'un vrai bug de production. Le digest est désormais accessible, mais
   * REPLIÉ et hors evidence : un utilisateur ne doit pas lire une pile.
   *
   * Le message n'est affiché qu'HORS production : en production, seul le
   * digest (opaque, non sensible) est proposé. */
  const showMessage = process.env.NODE_ENV !== 'production';
  const digest = error.digest ?? null;
  const hasDetails = Boolean(digest) || showMessage;

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

      {hasDetails ? (
        <div className="w-full max-w-lg text-center">
          <button
            type="button"
            onClick={() => setDetailsOpen((open) => !open)}
            aria-expanded={detailsOpen}
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {detailsOpen ? 'Masquer les détails techniques' : 'Détails techniques'}
          </button>
          {detailsOpen ? (
            <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-muted/30 p-3 text-left text-[11px] leading-relaxed text-muted-foreground">
              {digest ? `digest : ${digest}\n` : ''}
              {showMessage ? `message : ${error.message}\n` : ''}
              {showMessage ? `stack :\n${error.stack ?? '(aucune)'}` : ''}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}