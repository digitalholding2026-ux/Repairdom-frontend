/* CHANTIER PAIEMENT P0/P1 — génération de clé d'idempotence.
 *
 * Pur, sans dépendance (ni React) pour rester testable hors navigateur.
 * `crypto.randomUUID()` quand disponible, repli déterministe dans le format
 * sinon (contexte non-secure / HTTP / SSR) : le paiement ne doit jamais
 * casser à cause de l'environnement. Le backend accepte toute chaîne non
 * vide ≤ 100 caractères (`sanitizeIdempotencyKey`). */

function fallbackUuid(): string {
  const rand = (n: number): string => {
    let out = '';
    for (let i = 0; i < n; i += 1) {
      out += Math.floor(Math.random() * 16).toString(16);
    }
    return out;
  };
  // Format 8-4-4-4-12 compatible avec les attentes backend/UUID.
  return `${rand(8)}-${rand(4)}-4${rand(3)}-${((8 + Math.floor(Math.random() * 4)) % 16).toString(16)}${rand(3)}-${rand(12)}`;
}

export function createIdempotencyKey(): string {
  try {
    const cryptoRef =
      typeof globalThis !== 'undefined'
        ? (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
        : undefined;
    if (cryptoRef?.randomUUID) return cryptoRef.randomUUID();
  } catch {
    /* Repli ci-dessous. */
  }
  return fallbackUuid();
}
