/* UI-2 — message d'erreur utilisateur centralisé (frontend uniquement).
 *
 * Ne modifie aucun contrat backend : lit `code` / `status` quand l'erreur
 * les expose (ApiError), sinon filtre les messages techniques. Les messages
 * métier français sûrs passent tels quels ; tout le reste retombe sur un
 * texte générique actionnable. Ne jamais y faire transiter de secret. */

const CODE_MESSAGES: Record<string, string> = {
  INSUFFICIENT_FUNDS: 'Solde insuffisant pour cette opération.',
  PAYMENT_FAILED: "Le paiement n'a pas abouti. Aucun montant n'a été débité.",
  WITHDRAWAL_FAILED: "Le retrait n'a pas abouti. Aucun montant n'a été débité.",
  PROVIDER_UNAVAILABLE:
    'Le service de paiement est momentanément indisponible. Réessayez dans quelques instants.',
  COMMUNICATION_ERROR:
    'Communication impossible avec le service de paiement. Vérifiez le statut avant de recommencer.',
  TRANSACTION_UNKNOWN: 'Transaction introuvable côté service de paiement.',
  VALIDATION_ERROR: 'Certaines informations sont invalides. Vérifiez votre saisie.',
};

const NETWORK_MESSAGE = 'Connexion impossible. Vérifiez votre connexion puis réessayez.';
const GENERIC_MESSAGE = 'Une erreur est survenue. Réessayez dans quelques instants.';

const NETWORK_PATTERNS = [
  /failed to fetch/i,
  /fetch failed/i,
  /networkerror/i,
  /econnrefused/i,
  /enotfound/i,
  /getaddrinfo/i,
  /network request failed/i,
];

/* Formes techniques à ne jamais exposer (HTML, JSON, secrets, pile,
 * erreurs runtime/ORM). Les messages métier français (accents, montants
 * XAF, « … », parenthèses) ne correspondent à aucun de ces motifs. */
const TECHNICAL_PATTERNS = [
  /^\s*</,
  /[{}[\]]/,
  /sk_(live|test)_/i,
  /bearer\s+[A-Za-z0-9]/i,
  /authorization\s*:/i,
  /unexpected token|unexpected end of/i,
  /is not valid json/i,
  /prisma|P20\d\d|unique constraint|foreign key/i,
  /\bsql\b/i,
  /cannot read propert|cannot set propert|undefined is not|null is not an object/i,
  /internal server error/i,
  /\.js:\d+|:\d+:\d+/,
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Convertit une erreur en message français sûr pour l'UI. */
export function toUserErrorMessage(err: unknown, fallback = GENERIC_MESSAGE): string {
  const record = asRecord(err);
  const code = record?.code;
  if (typeof code === 'string' && CODE_MESSAGES[code]) return CODE_MESSAGES[code];

  const status = record?.status;
  if (status === 401) return 'Votre session a expiré. Reconnectez-vous.';
  if (status === 429) return 'Trop de tentatives. Patientez quelques instants puis réessayez.';

  const raw = err instanceof Error ? err.message.trim() : '';
  if (!raw) return fallback;
  if (NETWORK_PATTERNS.some((pattern) => pattern.test(raw))) return NETWORK_MESSAGE;
  if (raw.length > 220 || TECHNICAL_PATTERNS.some((pattern) => pattern.test(raw))) {
    return fallback;
  }
  return raw;
}
