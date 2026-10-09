/* TRANSPARENCE SASPAY — frais Mobile Money, APERÇU AVANT VALIDATION.
 *
 * ┌───────────┬───────────────┬────────────┬────────────────┐
 * │ Recharge  │ Frais 4,5 %   │ Total payé │ Solde crédité  │
 * ├───────────┼───────────────┼────────────┼────────────────┤
 * │ 2 000     │ 90            │ 2 090      │ 2 000          │
 * │ 5 000     │ 225           │ 5 225      │ 5 000          │
 * │ 10 000    │ 450           │ 10 450     │ 10 000         │
 * └───────────┴───────────────┴────────────┴────────────────┘
 *
 * POURQUOI CE DOUBLON EST LÉGITIME
 * Le backend reste l'autorité : SasPay débite le montant qu'il constate et
 * Relio crédite le `netAmountMinor` réellement encaissé
 * (`financial.service.ts` → `confirmTopupFromSasPay`). Ce module ne sert
 * qu'à l'APERÇU affiché pendant la saisie — moment où aucun aller-retour
 * HTTP n'est possible à chaque frappe, et où l'utilisateur DOIT voir le
 * montant avant de valider.
 *
 * Le risque de divergence est couvert par `saspay-fees.test.ts`, qui
 * verrouille ces constantes ET les exemples canoniques ci-dessus. Les mêmes
 * constantes sont testées côté backend dans
 * `backend/src/financial/saspay-fees.spec.ts`.
 *
 * Les montants restent des ENTIERS XAF : le formatage FCFA est fait à
 * l'affichage par `formatFCFA`, jamais ici.
 */

/** Encaissement : frais ajoutés au client sur une recharge (4,5 %). */
export const SASPAY_COLLECT_RATE = 0.045;

/** Libellé du poste de frais, tel qu'affiché à l'utilisateur. */
export const SASPAY_COLLECT_FEE_LABEL = 'Frais Mobile Money (4,5 %)';

/**
 * Frais d'encaissement SasPay que le client paie sur une recharge.
 * Arrondi au XAF supérieur : le total affiché ne doit jamais être inférieur
 * à ce que SasPay débite réellement.
 */
export function computeSaspayCollectFee(amountXAF: number): number {
  if (!Number.isFinite(amountXAF) || amountXAF <= 0) return 0;
  return Math.ceil(amountXAF * SASPAY_COLLECT_RATE);
}

/**
 * Total réellement débité au client pour un solde crédité de `amountXAF`.
 * La recharge est un `ADD_ON` : le client paie son solde + les frais.
 */
export function computeSaspayCollectTotal(amountXAF: number): number {
  return amountXAF + computeSaspayCollectFee(amountXAF);
}

export interface TopupFeePreview {
  /** Solde demandé par le client (montant de l'intention). */
  credited: number;
  /** Frais Mobile Money à la charge du client. */
  fee: number;
  /** Total débité par SasPay sur le compte du client. */
  totalToPay: number;
  /** L'aperçu est-il affichable (montant entier strictement positif) ? */
  valid: boolean;
}

/**
 * Récapitulatif de recharge : les trois lignes de l'aperçu.
 * `valid` à `false` neutralise l'aperçu tant que la saisie n'est pas valide,
 * pour ne jamais annoncer un total sur un montant aberrant.
 */
export function previewTopupFees(amountXAF: number): TopupFeePreview {
  const valid = Number.isInteger(amountXAF) && amountXAF > 0;
  const credited = valid ? amountXAF : 0;
  return {
    credited,
    fee: computeSaspayCollectFee(credited),
    totalToPay: computeSaspayCollectTotal(credited),
    valid,
  };
}