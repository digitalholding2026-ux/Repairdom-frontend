/**
 * Erreur d'API partagée.
 *
 * AVANT : `ApiError` était recopié à l'identique dans 11 fichiers de
 * `lib/api/`. Chaque copie pouvait diverger (un `instanceof` échouait dès
 * qu'un composant catchait le type défini ailleurs). Une seule classe, donc
 * un seul `instanceof`.
 */
export class ApiError extends Error {
  status: number;
  /** Code métier backend stable (ex. `KYC_REQUIRED`), sinon `null`. */
  code: string | null;

  constructor(message: string, status: number, code?: string | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code ?? null;
  }
}

/**
 * Extrait le message d'erreur d'une réponse backend.
 *
 * NestJS renvoie `message` sous forme de chaîne OU de tableau de chaînes
 * (lorsque plusieurs validateurs échouent) : les deux cas sont aplatis en un
 * seul texte lisible.
 */
export function extractApiErrorMessage(body: unknown, fallback: string): string {
  const message = (body as { message?: string | string[] } | null)?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message ?? fallback;
}

/** Erreur d'API dénormalisée depuis un `Response` en échec. */
export function toApiError(res: { status: number }, body: unknown): ApiError {
  const payload = body as { code?: string } | null;
  const code = typeof payload?.code === 'string' ? payload.code : null;
  return new ApiError(extractApiErrorMessage(body, `Erreur ${res.status}`), res.status, code);
}