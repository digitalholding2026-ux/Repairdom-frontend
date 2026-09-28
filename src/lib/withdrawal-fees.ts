/* CHANTIER PAIEMENT P0/P1 — explication des frais de retrait.
 *
 * Le backend constate le mode de facturation (`feeChargeMode` renvoyé par
 * SasPay, stocké en metadata, exposé tel quel) : `ADD_ON` = frais ajoutés
 * au montant débité, `DEDUCTED` = frais déduits du montant reçu. Ce module
 * ne fait que formuler ce constat — jamais de frais hardcodés ni calculés
 * ici. Pur, sans dépendance. */

export function feeChargeModeNote(feeChargeMode: string | null | undefined): string | null {
  if (feeChargeMode === 'ADD_ON') return 'Frais ajoutés au montant débité.';
  if (feeChargeMode === 'DEDUCTED') return 'Frais déduits du montant reçu par le bénéficiaire.';
  return null;
}
