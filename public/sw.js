/* Relio SW v2 — PUSH UNIQUEMENT (pas de cache offline, pas de PWA).
 * Portée : / (fichier à la racine de public/). Ne pas transformer en cache
 * offline sans décision produit explicite (voir ARCHITECTURE.md).
 * Incrémenter la version ci-dessus à chaque modification (les navigateurs
 * cachent agressivement les Service Workers : tout changement d'octets
 * déclenche la mise à jour, skipWaiting + clients.claim la rend immédiate).
 *
 * - `push` : affiche la notification (titre + options du payload backend).
 *   Si un onglet de l'app est VISIBLE, on n'affiche rien (le SSE a déjà
 *   notifié — le backend skippe déjà si SSE actif, ceci est la ceinture),
 *   SAUF si le payload contient `force: true` (push de test : affiché
 *   TOUJOURS, même onglet visible).
 * - `notificationclick` : ferme puis ouvre/focus l'URL du payload.
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = {};
  }
  const title = typeof data.title === 'string' ? data.title : 'Relio';
  const options = {
    body: typeof data.body === 'string' ? data.body : '',
    icon: typeof data.icon === 'string' ? data.icon : '/brand/relio-mark.svg',
    badge: typeof data.badge === 'string' ? data.badge : '/brand/relio-mark.svg',
    tag: typeof data.tag === 'string' ? data.tag : undefined,
    data: typeof data.data === 'object' && data.data !== null ? data.data : {},
  };
  event.waitUntil(
    (async () => {
      // Si force=true, on affiche TOUJOURS (bypass anti-doublon SSE).
      if (!data.force) {
        try {
          const windows = await self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true,
          });
          const visible = windows.some((client) => client.visibilityState === 'visible');
          if (visible) return;
        } catch (_) {
          // best-effort
        }
      }
      await self.registration.showNotification(title, options);
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl =
    event.notification.data && typeof event.notification.data.url === 'string'
      ? event.notification.data.url
      : '/';
  const url = rawUrl.startsWith('/') ? rawUrl : '/';
  event.waitUntil(
    (async () => {
      try {
        const windows = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });
        for (const client of windows) {
          try {
            const clientUrl = new URL(client.url);
            if (clientUrl.pathname === url.split('?')[0] && 'focus' in client) {
              await client.focus();
              return;
            }
          } catch (_) {
            // URL illisible : on continue vers openWindow.
          }
        }
        await self.clients.openWindow(url);
      } catch (_) {
        // Échec silencieux : la notification est déjà fermée.
      }
    })(),
  );
});
