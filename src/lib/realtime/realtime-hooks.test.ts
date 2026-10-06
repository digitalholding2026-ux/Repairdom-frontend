/* Intégration temps réel (statique) : hooks branchés, polling en fallback.
 *   node --test src/lib/realtime/realtime-hooks.test.ts
 * - use-mission-stream / use-user-stream / use-technician-stream :
 *   abonnement + cleanup à l'unmount ;
 * - ConversationSection : ajout direct du message + polling ignoré en SSE ;
 * - pages mission : rechargement piloté par événements, polling fallback ;
 * - liste technicien : refetch silencieux sur disponibles/prises ;
 * - NotificationsCenter + badge : refetch/incrément sur notification.created.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel: string): string =>
  readFileSync(new URL(rel, import.meta.url), 'utf8');

void test('hooks : abonnement + cleanup à l’unmount', () => {
  for (const file of ['./use-mission-stream.ts', './use-user-stream.ts']) {
    const src = read(file);
    assert.match(src, /subscribe\(/);
    assert.match(src, /return subscribe\(/);
  }
  const ctx = read('./sse-context.tsx');
  assert.match(ctx, /RealtimeProvider/);
  assert.match(ctx, /onStatusChange/);
  assert.match(ctx, /Mise à jour en temps réel indisponible/);
});

void test('chat : ajout direct + polling en fallback uniquement', () => {
  const src = read('../../components/mission/conversation-section.tsx');
  assert.match(src, /missionStreamUrl\(demandeId\)/);
  assert.match(src, /mission\.message_created/);
  assert.match(src, /realtimeStatusRef\.current === 'sse'/);
});

void test('pages mission : rechargement piloté par événements', () => {
  const client = read('../../app/client/demandes/[id]/page.tsx');
  assert.match(client, /sseTick/);
  assert.match(client, /mission\.message_created/);
  const tech = read('../../app/technicien/demandes/[id]/page.tsx');
  assert.match(tech, /setRefreshKey\(\(key\) => key \+ 1\)/);
});

void test('liste technicien : refetch silencieux (pas de skeleton)', () => {
  const src = read('../../app/technicien/demandes/page.tsx');
  assert.match(src, /useTechnicianStream/);
  assert.match(src, /technician\.new_mission_available/);
  assert.match(src, /technician\.mission_taken/);
  // Refetch silencieux : le handler SSE ne touche pas au flag loading.
  assert.match(src, /setMissions\(list\)/);
  assert.match(src, /setError\(null\)/);
});

void test('notifications : refetch centre + incrément badge', () => {
  const center = read('../../components/notifications/notifications-center.tsx');
  // L'abonnement au flux utilisateur a été extrait dans le hook partagé
  // `useNotificationsCenter` : le composant ne fait plus que rendre.
  assert.match(center, /NotificationsCenterProps/);
  assert.match(read('../notifications/use-notifications-center.ts'), /useUserStream/);
  const hook = read('../use-unread-notifications.ts');
  assert.match(hook, /bumpUnreadNotifications/);
  assert.match(hook, /notification\.created/);
  assert.match(hook, /getStatus\(\) === 'sse'/);
});
