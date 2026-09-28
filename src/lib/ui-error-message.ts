/* CHANTIER ERREURS P1 — point d'entrée STANDARD pour toutes les erreurs
 * UI (Alert, toast, erreurs de formulaire, états de page). Ne modifie
 * aucun contrat backend : lit `code` / `status` quand l'erreur les expose
 * (ApiError), sinon filtre les messages techniques. Les messages métier
 * français sûrs passent tels quels ; tout le reste retombe sur un texte
 * générique actionnable. Ne jamais y faire transiter de secret. */

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
  /* CHANTIER PAIEMENT P0/P1 — cas métier paiement explicites (jamais de
   * stack, de brut technique ni de clé d'idempotence exposés). */
  CANCELLED: "Opération annulée. Aucun montant n'a été débité.",
  PAYMENT_CANCELLED: "Paiement annulé. Aucun montant n'a été débité.",
  WITHDRAWAL_CANCELLED: "Retrait annulé. Aucun montant n'a été débité.",
  CONFLICT:
    'Cette opération a déjà été enregistrée. Vérifiez son statut avant toute nouvelle tentative.',
  PAYMENT_REFUSED: "Le paiement a été refusé. Aucun montant n'a été débité.",
  PAYMENT_ERROR: "Le paiement n'a pas abouti. Aucun montant n'a été débité.",
  WITHDRAWAL_REFUSED: "Le retrait a été refusé. Aucun montant n'a été débité.",
  WITHDRAWAL_ERROR: "Le retrait n'a pas abouti. Aucun montant n'a été débité.",
  IDEMPOTENCY_CONFLICT:
    'Cette opération a déjà été enregistrée. Vérifiez son statut avant toute nouvelle tentative.',
  /* CHANTIER ERREURS P1 — codes métier génériques réellement rencontrés
   * (backend : 403/404 métier, KYC, validation). Aucun code inventé sans
   * usage : chaque entrée correspond à un cas API existant. */
  FORBIDDEN: "Cette action ne vous est pas autorisée.",
  ACCESS_DENIED: "Cette action ne vous est pas autorisée.",
  NOT_FOUND: 'Ressource introuvable. Elle a peut-être été déplacée ou supprimée.',
  RESOURCE_NOT_FOUND: 'Ressource introuvable. Elle a peut-être été déplacée ou supprimée.',
  DEMANDE_NOT_FOUND: 'Mission introuvable. Elle a peut-être été déplacée ou supprimée.',
  USER_NOT_FOUND: 'Compte introuvable.',
  VALIDATION_FAILED: 'Certaines informations sont invalides. Vérifiez votre saisie.',
  INVALID_INPUT: 'Certaines informations sont invalides. Vérifiez votre saisie.',
  RATE_LIMITED: 'Trop de tentatives. Patientez quelques instants puis réessayez.',
  PAYLOAD_TOO_LARGE: 'Le fichier dépasse la taille maximale autorisée.',
  FILE_TOO_LARGE: 'Le fichier dépasse la taille maximale autorisée.',
  KYC_REQUIRED: 'Votre compte doit être vérifié avant cette action.',
  KYC_PENDING: 'Votre vérification est en cours. Réessayez une fois validée.',
  KYC_REJECTED: 'Votre vérification a été refusée. Consultez votre profil.',
  SESSION_EXPIRED: 'Votre session a expiré. Reconnectez-vous.',
  UNAUTHORIZED: 'Authentification nécessaire. Reconnectez-vous.',
};

/* Mapping HTTP (uniquement si aucun code métier plus précis n'existe :
 * le code reste prioritaire). Messages FR courts et actionnables. */
const STATUS_MESSAGES: Record<number, string> = {
  400: 'La demande est invalide. Vérifiez votre saisie.',
  401: 'Votre session a expiré. Reconnectez-vous.',
  403: "Cette action ne vous est pas autorisée.",
  404: 'Ressource introuvable. Elle a peut-être été déplacée ou supprimée.',
  409: "Action impossible : l'état de la ressource a changé. Actualisez puis réessayez.",
  422: 'Certaines informations sont invalides. Vérifiez votre saisie.',
  429: 'Trop de tentatives. Patientez quelques instants puis réessayez.',
  500: 'Erreur temporaire du service. Réessayez dans quelques instants.',
  502: 'Erreur temporaire du service. Réessayez dans quelques instants.',
  503: 'Erreur temporaire du service. Réessayez dans quelques instants.',
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
 * erreurs runtime/ORM, clés d'idempotence). Les messages métier français
 * (accents, montants XAF, « … », parenthèses) ne correspondent à aucun de
 * ces motifs. */
const TECHNICAL_PATTERNS = [
  /^\s*</,
  /[{}[\]]/,
  /sk_(live|test)_/i,
  /whsec_/i,
  /bearer\s+[A-Za-z0-9]/i,
  /authorization\s*:/i,
  /x-api-key|api[_-]?key\s*[:=]/i,
  /idempotency[_-]?key/i,
  /unexpected token|unexpected end of/i,
  /is not valid json/i,
  /prisma|P20\d\d|unique constraint|foreign key/i,
  /\bsql\b/i,
  /\b(select|insert|update|delete)\b.{0,60}\b(from|into|where|set)\b/i,
  /cannot read propert|cannot set propert|undefined is not|null is not an object/i,
  /internal server error/i,
  /\.js:\d+|:\d+:\d+/,
  /\bat\s+[\w.<>]+\s*\(/i,
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Convertit une erreur en message français sûr pour l'UI. Le code
 *  métier est prioritaire sur le statut HTTP (un 404 avec code précis
 *  affiche le message du code, pas le générique). */
export function toUserErrorMessage(err: unknown, fallback = GENERIC_MESSAGE): string {
  const record = asRecord(err);
  const rawCode = record?.code;
  if (typeof rawCode === 'string') {
    // Les codes SasPay/backend varient en casse/format (`idempotency_conflict`
    // vs `IDEMPOTENCY_CONFLICT`, `not_found` vs `NOT_FOUND`) : normalisation.
    const code = rawCode.toUpperCase();
    if (CODE_MESSAGES[code]) return CODE_MESSAGES[code];
  }

  const status = record?.status;
  if (typeof status === 'number' && STATUS_MESSAGES[status]) {
    // 409 sans code précis : conflit d'idempotence probable (clé rejouée).
    if (status === 409 && !rawCode) return CODE_MESSAGES.IDEMPOTENCY_CONFLICT;
    return STATUS_MESSAGES[status];
  }
  // Erreurs serveur non répertoriées (5xx) : message temporaire générique.
  if (typeof status === 'number' && status >= 500) return STATUS_MESSAGES[500];

  const raw = err instanceof Error ? err.message.trim() : '';
  if (!raw) return fallback;
  if (NETWORK_PATTERNS.some((pattern) => pattern.test(raw))) return NETWORK_MESSAGE;
  if (raw.length > 220 || TECHNICAL_PATTERNS.some((pattern) => pattern.test(raw))) {
    return fallback;
  }
  // Unité d'affichage : les messages métier backend exposent le code ISO
  // « XAF », l'utilisateur voit « FCFA ».
  return raw.replace(/\bXAF\b/g, 'FCFA');
}

/** Vrai si l'erreur signale une ressource introuvable (statut 404 ou code
 *  métier, jamais de détection par substring sur le message affiché). */
export function isNotFoundError(err: unknown): boolean {
  const record = asRecord(err);
  if (record?.status === 404) return true;
  const rawCode = record?.code;
  if (typeof rawCode === 'string') {
    const code = rawCode.toUpperCase();
    return (
      code === 'NOT_FOUND' ||
      code === 'RESOURCE_NOT_FOUND' ||
      code === 'DEMANDE_NOT_FOUND' ||
      code === 'USER_NOT_FOUND'
    );
  }
  return false;
}

/** Vrai si l'erreur signale un accès interdit (403 + codes métier). */
export function isForbiddenError(err: unknown): boolean {
  const record = asRecord(err);
  if (record?.status === 403) return true;
  const rawCode = record?.code;
  if (typeof rawCode === 'string') {
    const code = rawCode.toUpperCase();
    return code === 'FORBIDDEN' || code === 'ACCESS_DENIED';
  }
  return false;
}
