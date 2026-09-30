/* IA-10 — information des utilisateurs sur l'analyse automatisée.
 *
 * Exécuté avec Node 24 natif (zéro dépendance) :
 *   node --test src/lib/conversation-transparency.test.ts
 * ou : npm run test:unit
 * Vérifications statiques du composant partagé client/technicien
 * (jamais bundlé différemment, exclu du tsconfig Next comme les autres).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const section = readFileSync(
  new URL('../components/mission/conversation-section.tsx', import.meta.url),
  'utf8',
);

test('notice courte présente (sécurité + contrôle humain, sans jargon)', () => {
  assert.match(section, /analysés automatiquement à des fins de sécurité/);
  assert.match(section, /sans contrôle humain/);
});

test('renvoi vers les conditions, pas de texte juridique inline', () => {
  assert.match(section, /href="\/conditions-utilisation"/);
  assert.ok(section.length < 12000, 'le composant reste une UI légère');
});

test('aucune mention de sanction/fraude établie côté produit', () => {
  const notice = section.slice(section.indexOf('IA-10'));
  assert.doesNotMatch(notice, /sanction|fraude établie|suspendu/i);
});
