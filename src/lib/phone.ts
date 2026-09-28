/* CHANTIER PAIEMENT P0/P1 — normalisation téléphonique côté frontend.
 *
 * Miroir de `backend/src/saspay/saspay-networks.ts#normalizeMsisdn`
 * (le backend reste la source de vérité et re-normalise à la réception).
 * L'UI affiche `+237` en préfixe décoratif : cette normalisation évite
 * d'envoyer le numéro local tel quel. Converge vers E.164 camerounais
 * `+237XXXXXXXXX`, sans jamais doubler l'indicatif. Pur, sans dépendance. */

export function normalizeCmPhone(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.replace(/[\s.\-()]/g, '');
  if (clean.length === 0) return null;
  const hasPlus = clean.startsWith('+');
  const digits = hasPlus ? clean.slice(1) : clean;
  if (!/^[0-9]{9,15}$/.test(digits)) return null;
  if (digits.length === 9) return `+237${digits}`;
  if (digits.length === 12 && digits.startsWith('237')) return `+${digits}`;
  return `+${digits}`;
}

/** Vrai si le numéro est exploitable pour Mobile Money (validation légère,
 *  le gateway reste seul juge de l'existence réelle). */
export function isValidCmPhone(value: unknown): boolean {
  return normalizeCmPhone(value) !== null;
}
