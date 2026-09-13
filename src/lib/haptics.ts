let hasVibrate = false;

function detectVibrate(): boolean {
  if (hasVibrate || typeof navigator === 'undefined') return hasVibrate;
  hasVibrate = 'vibrate' in navigator;
  return hasVibrate;
}

/**
 * Retour haptique natif (mobile) quand le matériel le supporte.
 * Sans effet sur les postes de travail / navigateurs non compatibles.
 */
export function triggerHaptic(ms = 8): void {
  if (!detectVibrate()) return;
  try {
    navigator.vibrate(ms);
  } catch {
    // certains navigateurs (ex. iOS Safari non MWK) peuvent le rejeter.
  }
}