/* Assistant Backoffice : conversation libre admin, lecture seule.
 *   node --test src/lib/assistant.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel: string): string =>
  readFileSync(new URL(rel, import.meta.url), 'utf8');

void test('service : statut + conversation vers /admin/agent', () => {
  const service = read('./api/admin-service.ts');
  assert.match(service, /getBackofficeAgentStatus/);
  assert.match(service, /\/admin\/agent\/status/);
  assert.match(service, /postBackofficeAgentChat/);
  assert.match(service, /\/admin\/agent\/chat/);
  // Historique de session plafonné, jamais persisté.
  assert.match(service, /\.slice\(-10\)/);
  assert.doesNotMatch(service, /localStorage/);
});

void test('page assistant : conversation libre, session uniquement', () => {
  const page = read('../app/admin/assistant/page.tsx');
  assert.match(page, /Votre question sur les données Relio/);
  assert.match(page, /Nouvelle conversation/);
  assert.match(page, /Lecture seule/);
  assert.match(page, /maxLength=\{2000\}/);
  assert.doesNotMatch(page, /localStorage/);
  // Aucun prompt prédéfini imposé : un champ libre, pas de liste de boutons.
  assert.doesNotMatch(page, /Questions rapides|prompts prédéfinis/i);
});

void test('navigation admin : entrée Assistant', () => {
  const layout = read('../app/admin/layout.tsx');
  assert.match(layout, /\/admin\/assistant/);
  assert.match(layout, /Assistant/);
});
