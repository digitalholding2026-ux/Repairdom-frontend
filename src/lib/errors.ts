export function extractErrorMessage(err: unknown, fallback = 'Erreur inattendue.'): string {
  return err instanceof Error ? err.message : fallback;
}