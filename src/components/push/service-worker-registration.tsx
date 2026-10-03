'use client';

import { useEffect } from 'react';

/* Enregistrement du Service Worker push (`/sw.js`, push uniquement).
 * Au premier montage uniquement, échec silencieux (jamais bloquant).
 * AUCUNE demande de permission ici : opt-in explicite par clic seul. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);
  return null;
}
