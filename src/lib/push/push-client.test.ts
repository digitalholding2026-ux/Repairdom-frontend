/* Push web : capacités, VAPID, opt-in explicite (jamais auto).
 *   node --test src/lib/push/push-client.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  pushSupportState,
  urlBase64ToUint8Array,
  getStoredPushEndpoint,
  setStoredPushEndpoint,
} from './push-client.ts';

const read = (rel: string): string =>
  readFileSync(new URL(rel, import.meta.url), 'utf8');

void test('push-client.subscribe() envoie la subscription au backend', () => {
  const src = read('./push-context.tsx');
  assert.match(src, /sendPushSubscription/);
  assert.match(src, /subscribeBrowserPush/);
  assert.match(src, /getVapidPublicKey/);
});

void test('détection iOS Safari non-standalone → état adapté', () => {
  const iosSafari = {
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    serviceWorker: {},
  };
  const win = { PushManager: {}, matchMedia: () => ({ matches: false }) };
  assert.equal(pushSupportState(iosSafari, win), 'unsupported_ios_needs_install');
  const standaloneWin = { PushManager: {}, matchMedia: () => ({ matches: true }) };
  assert.equal(pushSupportState(iosSafari, standaloneWin), 'supported');
  const desktop = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
    serviceWorker: {},
  };
  assert.equal(pushSupportState(desktop, win), 'supported');
  assert.equal(pushSupportState({}, win), 'unsupported_no_api');
});

void test('urlBase64ToUint8Array : clé VAPID décodée', () => {
  const valid = urlBase64ToUint8Array('BO2Yhy8kreL2Zb557qRAc5x8K4E4u4xQe2YH4q8kYFsc');
  assert.ok(valid.length > 0);
  assert.ok(valid instanceof Uint8Array);
});

void test('endpoint stocké : écriture/lecture/suppression', () => {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  } as unknown as Storage;
  assert.equal(getStoredPushEndpoint(storage), null);
  setStoredPushEndpoint('https://push.example/sub', storage);
  assert.equal(getStoredPushEndpoint(storage), 'https://push.example/sub');
  setStoredPushEndpoint(null, storage);
  assert.equal(getStoredPushEndpoint(storage), null);
});

void test('carte : états affichés (supporté, refusé, inactif, activé)', () => {
  const src = read('../../components/ui/push-notification-card.tsx');
  assert.match(src, /Non supporté par ce navigateur/);
  assert.match(src, /écran d’accueil/);
  assert.match(src, /Désactivées/);
  assert.match(src, /Activées/);
  assert.match(src, /Activer les notifications push/);
  assert.match(src, /Désactiver/);
  assert.match(src, /Tester les notifications/);
});

void test('pas de demande de permission automatique au montage', () => {
  const context = read('./push-context.tsx');
  // Une seule demande, dans le handler explicite `enable` (clic utilisateur).
  assert.equal(context.split('requestPermission').length - 1, 1);
  assert.match(context, /const enable = useCallback/);
  const sw = read('../../components/push/service-worker-registration.tsx');
  assert.match(sw, /register\('\/sw\.js'\)/);
  assert.doesNotMatch(sw, /requestPermission|Notification/);
  const layout = read('../../app/layout.tsx');
  assert.match(layout, /ServiceWorkerRegistration/);
  assert.match(layout, /PushProvider/);
});

void test('sw.js : force=true bypass l\'anti-doublon (bouton Tester)', () => {
  const sw = read('../../../public/sw.js');
  // Le payload de test (force:true) est affiché TOUJOURS, même onglet visible.
  assert.match(sw, /if\s*\(\s*!data\.force\s*\)/);
  assert.match(sw, /showNotification/);
});

void test('sw.js : anti-doublon SSE conservé pour les pushs métier', () => {
  const sw = read('../../../public/sw.js');
  // Sans force, un onglet visible skip l'affichage (le SSE a déjà notifié).
  assert.match(sw, /clients\.matchAll/);
  assert.match(sw, /visibilityState/);
  assert.match(sw, /if\s*\(visible\)\s*return/);
});

void test('sw.js : version + prise en main immédiate (skipWaiting/claim)', () => {
  const sw = read('../../../public/sw.js');
  assert.match(sw, /Relio SW v\d+/);
  assert.match(sw, /skipWaiting/);
  assert.match(sw, /clients\.claim/);
  // Toujours PAS de cache offline : que du push + notificationclick.
  assert.match(sw, /notificationclick/);
  assert.doesNotMatch(sw, /caches\.open|addAll|fetch/);
});
