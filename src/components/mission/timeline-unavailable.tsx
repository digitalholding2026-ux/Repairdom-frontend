import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';

/* Écran « historique injoignable » — partagé par les deux espaces.
 *
 * POURQUOI UN COMPOSANT
 * L'écran client et l'écran technicien affichaient le même échec, recopié. Ils
 * ne différaient que par une phrase : chacun disait en effet « le reste de
 * cette page reste à jour », mais le client « le reste de la page » et le
 * technicien « les autres informations de cet onglet » — parce que les deux
 * écrans n'ont pas la même forme.
 *
 * La description reste donc un paramètre : elle dit ce qui reste vrai, et
 * ce qui reste vrai diffère. Tout le reste — icône, titre, bouton — est
 * identique et n'a pas lieu de l'être deux fois.
 *
 * Le titre et le libellé du bouton sont identiques des deux côtés depuis
 * l'origine ; ils sont vérifiés par un test sur les DEUX fichiers. Les garder
 * ici, donc, c'est aussi ce qui garantit qu'ils le restent.
 */

export function TimelineUnavailable({
  description,
  onRetry,
}: {
  /** Phrase décrivant ce qui reste consultable — dépend de la forme de l'écran. */
  description: string;
  onRetry: () => void;
}) {
  return (
    <EmptyState
      icon={<Icon name="clock" size="md" />}
      title="Impossible de charger l’historique"
      description={description}
      action={
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Réessayer
        </Button>
      }
      className="py-6"
    />
  );
}