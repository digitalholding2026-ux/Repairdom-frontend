/* TRANSPARENCE SASPAY — ce qui est affiché au TECHNICIEN.
 *
 * Option A : Relio absorbe les frais de payout de l'opérateur. Le taux
 * n'est délibérément pas mentionné ici : le technicien n'a rien à calculer,
 * seulement une reassurance sur le montant qu'il va encaisser. Le taux réel
 * vit côté serveur (`backend/src/financial/saspay-fees.ts`). Le
 * technicien voit donc TOUJOURS son net — celui qu'il recevra réellement sur
 * son Mobile Money — et jamais le brut envoyé au prestataire.
 *
 * RÈGLE ABSOLUE DE CE CHANTIER : aucun montant de frais SasPay ne doit
 * apparaître côté technicien. Il n'a pas à connaître le coût du transfert,
 * et l'afficher romprait la promesse « vous recevez exactement ce montant ».
 * Ce module est donc le SEUL endroit autorisé à formuler cette mention, et
 * `saspay-fees.test.ts` verrouille l'absence de tout montant.
 */

/**
 * Mention affichée sous un gain net technicien.
 *
 * @param context 'mission' (gain d'une mission) | 'retrait' (retrait
 *   Mobile Money). Le libellé reste identique : ce que le technicien veut
 *   savoir, c'est que le montant affiché est celui qu'il encaissera.
 */
export function relioAbsorbsTransferFeesNote(
  _context: 'mission' | 'retrait' | 'apercu-devis' = 'mission',
): string {
  return 'Frais de transfert Mobile Money pris en charge par Relio.';
}

/** Les 3 contextes d'affichage partagent la MÊME mention (aucune divergence). */
export const RELIO_ABSORBS_FEES_NOTE = relioAbsorbsTransferFeesNote();