/* Barème de commission technicien — APERÇU AVANT ENVOI DU DEVIS.
 *
 * RÈGLE (chantier 4-FONDATIONS-A, identique à
 * `backend/src/financial/fee-calculator.ts`) :
 *
 *   commission = 500 FCFA + 4 % du montant du devis
 *   net technicien = devis + 2 000 (transport) − commission
 *   montant minimum d'une intervention = 5 000 FCFA
 *
 * ┌───────────┬──────────────┬────────────┬──────────────────┐
 * │ Devis     │ Client paie  │ Commission │ Technicien reçoit│
 * ├───────────┼──────────────┼────────────┼──────────────────┤
 * │ 5 000     │ 7 000        │ 700        │ 6 300            │
 * │ 10 000    │ 12 000       │ 900        │ 11 100           │
 * │ 15 000    │ 17 000       │ 1 100      │ 15 900           │
 * │ 25 000    │ 27 000       │ 1 500      │ 25 500           │
 * │ 100 000   │ 102 000      │ 4 500      │ 97 500           │
 * └───────────┴──────────────┴────────────┴──────────────────┘
 *
 * POURQUOI CE DOUBLON EST LÉGITIME
 * Le backend reste l'autorité : c'est lui qui écrit le ledger et c'est lui qui
 * renvoie `commission` / `netTechnician` sur chaque devis (champs utilisés pour
 * l'affichage APRÈS envoi, sans aucun calcul frontend). Ce module ne sert
 * qu'à l'APERÇU en direct, pendant la saisie — moment où il n'existe encore aucun
 * devis en base, donc aucun aller-retour HTTP possible à chaque frappe.
 *
* Le risque de divergence est couvert par `technician-quote.test.ts`, qui
 * verrouille ces constantes ET les exemples canoniques. Toute modification du
 * barème côté backend doit s'accompagner de la mise à jour ici, sinon le
 * test échoue. Les montants restent des ENTIERS XAF : le formatage FCFA est
 * fait à l'affichage par `formatFCFA`, jamais ici.
 */

/** Part fixe de la commission, en XAF. */
export const TECHNICIAN_FEE_FIXED_XAF = 500;
/** Part proportionnelle, en pourcentage du montant du devis. */
export const TECHNICIAN_FEE_RATE_PERCENT = 4;
/** Montant minimum d'une intervention, en XAF. */
export const MIN_QUOTE_AMOUNT_XAF = 5_000;
/** Transport standard, reversé intégralement au technicien (pass-through). */
export const QUOTE_TRAVEL_FEE_XAF = 2_000;

/** Libellé court du barème, affiché au technicien (jamais de montant formaté
 *  dans une notification ; ici c'est de la UI, le formatage passe par
 *  `formatFCFA` pour les montants unitaires). */
export const TECHNICIAN_FEE_LABEL = 'Commission Relio (500 FCFA + 4 %)';

/**
 * Commission Relio sur un devis.
 * @param quoteAmountXAF montant du devis, entier XAF.
 * @returns commission en XAF entier.
 */
export function calculateTechnicianFee(quoteAmountXAF: number): number {
  if (!Number.isFinite(quoteAmountXAF) || quoteAmountXAF < 0) return 0;
  return TECHNICIAN_FEE_FIXED_XAF + Math.round((quoteAmountXAF * TECHNICIAN_FEE_RATE_PERCENT) / 100);
}

export interface TechnicianQuotePreview {
  /** Montant du devis saisi (= réparation). */
  quote: number;
  /** Ce que paie le client : devis + transport. */
  clientPays: number;
  /** Transport intégralement reversé au technicien. */
  travel: number;
  /** Commission Relio prélevée sur le devis seul. */
  commission: number;
  /** Ce que reçoit réellement le technicien. */
  net: number;
  /** Le devis respecte-t-il le minimum de 5 000 FCFA ? */
  allowed: boolean;
}

/** Récapitulatif complet d'un devis, pour l'aperçu avant envoi. */
export function previewTechnicianQuote(quoteAmountXAF: number): TechnicianQuotePreview {
  const quote = Number.isFinite(quoteAmountXAF) ? quoteAmountXAF : 0;
  const commission = calculateTechnicianFee(quote);
  return {
    quote,
    travel: QUOTE_TRAVEL_FEE_XAF,
    clientPays: quote + QUOTE_TRAVEL_FEE_XAF,
    commission,
    net: quote + QUOTE_TRAVEL_FEE_XAF - commission,
    allowed: isQuoteAmountAllowed(quote),
  };
}

/** Le montant est-il dans les bornes (entier, ≥ 5 000) ? */
export function isQuoteAmountAllowed(quoteAmountXAF: number): boolean {
  return Number.isInteger(quoteAmountXAF) && quoteAmountXAF >= MIN_QUOTE_AMOUNT_XAF;
}

/** Message d'erreur sous le seuil, ou `null` si le montant est acceptable. */
export function quoteAmountError(
  rawInput: string,
): { amount: number | null; error: string | null } {
  const trimmed = rawInput.trim();
  if (trimmed === '') return { amount: null, error: null };

  // Tolérance de saisie : espaces de milliers, insécables, comme partout ailleurs.
  const normalized = trimmed.replace(/[\s  ]/g, '');
  const amount = Number(normalized);

  if (normalized === '' || !Number.isFinite(amount)) {
    return { amount: null, error: 'Montant invalide : saisissez un nombre entier en FCFA.' };
  }
  if (!Number.isInteger(amount)) {
    return { amount: null, error: 'Montant invalide : saisissez un entier en FCFA (pas de centimes).' };
  }
  if (amount < 0) {
    return { amount: null, error: 'Le montant ne peut pas être négatif.' };
  }
  if (amount < MIN_QUOTE_AMOUNT_XAF) {
    return {
      amount,
      error: `Minimum ${MIN_QUOTE_AMOUNT_XAF.toLocaleString('fr-FR').replace(/\s/g, ' ')} FCFA par intervention.`,
    };
  }
  return { amount, error: null };
}