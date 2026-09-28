/* CHANTIER PAIEMENT P0/P1 — bornes financières frontend.
 *
 * Miroir des constantes backend (`financial-fees.ts` : MIN/MAX_TOPUP_AMOUNT
 * et MIN/MAX_WITHDRAWAL_AMOUNT, tous à 100 / 10 000 000 XAF). Le backend
 * reste la source de vérité (DTO + assert) : ce module ne sert qu'à la
 * pré-validation UX avant appel API. Pur, sans dépendance. */

export const MIN_FINANCE_AMOUNT = 100;
export const MAX_FINANCE_AMOUNT = 10_000_000;

/** Retourne un message d'erreur FR clair, ou null si le montant est valide. */
export function validateFinanceAmount(value: unknown, kind: 'recharge' | 'retrait'): string | null {
  const label = kind === 'recharge' ? 'recharge' : 'retrait';
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return `Montant invalide : saisissez un montant entier en FCFA.`;
  }
  if (value < MIN_FINANCE_AMOUNT) {
    return `Montant invalide : minimum 100 FCFA pour une ${label}.`;
  }
  if (value > MAX_FINANCE_AMOUNT) {
    return `Montant invalide : maximum 10 000 000 FCFA pour une ${label}.`;
  }
  return null;
}
