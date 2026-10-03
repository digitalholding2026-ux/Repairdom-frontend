/* Montant XAF entier, format affichage FCFA (espace insécable).
 * Les payloads SSE portent les montants en XAF (serveur) ; le formatage
 * FCFA est appliqué uniquement à l'affichage, via ce helper. */
export function formatFCFA(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return '—';
  // fr-FR groupe avec une espace fine insécable : normalisée en insécable
  // classique (U+00A0) pour un rendu déterministe.
  const grouped = Math.round(amount)
    .toLocaleString('fr-FR')
    .replace(/\s/g, String.fromCharCode(160));
  return `${grouped} FCFA`;
}
