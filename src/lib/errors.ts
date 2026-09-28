import { toUserErrorMessage } from './ui-error-message';

/* CHANTIER ERREURS P1 — point d'entrée historique conservé pour
 * compatibilité : délègue au sanitizer central (`toUserErrorMessage`).
 * Aucun message technique brut n'est exposé à l'utilisateur. */
export function extractErrorMessage(err: unknown, fallback = 'Erreur inattendue.'): string {
  return toUserErrorMessage(err, fallback);
}