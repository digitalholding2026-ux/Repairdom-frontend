'use client';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <EmptyState
        title="Page introuvable"
        description="La page que vous cherchez n’existe pas ou a été déplacée."
        action={
          <Button onClick={() => (window.location.href = '/')}>Retour à l’accueil</Button>
        }
      />
    </div>
  );
}