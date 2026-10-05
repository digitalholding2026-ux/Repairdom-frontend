'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useToast } from '@/lib/toast-context';

/* Bouton « copier » pour le numéro de suivi (ex. RD-8F4K29).
 *
 * Isolé dans ce Client Component car la page de confirmation est un Server
 * Component (lecture des `searchParams`). Aucune donnée n'est stockée :
 * on ne fait que copier le texte reçu en prop dans le presse-papiers. */
export function CopyTrackingReference({ value }: { value: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      // `navigator.clipboard` n'existe pas sur les navigateurs non sécurisés
      // (HTTP) : on évite un crash silencieux en testant l'API.
      if (!navigator.clipboard) {
        throw new Error('Clipboard indisponible');
      }
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({
        title: 'Numéro copié',
        description: `${value} est dans votre presse-papiers.`,
        variant: 'success',
      });
      // Retour visuel éphémère : on ne fige pas l'état « copié » indéfiniment.
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Copie impossible',
        description: 'Sélectionnez et copiez le numéro manuellement.',
        variant: 'warning',
      });
    }
  }

  return (
    <Button
      type="button"
      onClick={copy}
      variant="outline"
      size="sm"
      className="min-h-11 w-full"
      aria-label={copied ? 'Numéro de suivi copié' : 'Copier le numéro de suivi'}
    >
      <Icon name={copied ? 'check' : 'file'} size="sm" />
      {copied ? 'Numéro copié' : 'Copier le numéro'}
    </Button>
  );
}