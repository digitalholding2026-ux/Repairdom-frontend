/* IA-11 — Agent IA admin : route, navigation, contrat API, garde-fous.
 *
 * Exécuté avec Node 24 natif (zéro dépendance) :
 *   node --test src/lib/ai-agent.test.ts
 * ou : npm run test:unit
 * Vérifications statiques (jamais bundlé, exclu du tsconfig Next si besoin).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (rel: string): string =>
  readFileSync(new URL(rel, import.meta.url), 'utf8');

void test('route /admin/ai-agent : page dédiée sans conflit avec /admin/ai', () => {
  assert.ok(existsSync(new URL('../app/admin/ai-agent/page.tsx', import.meta.url)));
  assert.ok(existsSync(new URL('../app/admin/ai/page.tsx', import.meta.url)));
  const layout = read('../app/admin/layout.tsx');
  assert.match(layout, /href: '\/admin\/ai-agent', label: 'Agent IA'/);
});

void test('contrat API : session uniquement, jamais d’appel OpenRouter frontend', () => {
  const service = read('./api/admin-service.ts');
  assert.match(service, /postAdminAiAgentChat/);
  assert.match(service, /\/admin\/ai-agent\/chat/);
  assert.match(service, /getAdminAiAgentStatus/);
  assert.doesNotMatch(service, /OPENROUTER|openrouter|sk-or-/i);
  const hook = read('../components/admin/ai-agent/use-ai-agent.ts');
  assert.match(hook, /postAdminAiAgentChat/);
  assert.doesNotMatch(hook, /localStorage|indexedDB/i);
});

void test('UI : Desktop/Mobile séparés, chargement, erreur, suggestions', () => {
  const views = read('../components/admin/ai-agent/ai-agent-views.tsx');
  assert.match(views, /AiAgentDesktop/);
  assert.match(views, /AiAgentMobile/);
  assert.match(views, /Nouvelle conversation/);
  assert.match(views, /Questions rapides/);
  assert.match(views, /Lecture seule/);
  const hook = read('../components/admin/ai-agent/use-ai-agent.ts');
  assert.match(hook, /Techniciens disponibles/);
  assert.match(hook, /Surveillance IA/);
  assert.match(hook, /Demandes récentes/);
  assert.match(hook, /slice\(-10\)/);
  const page = read('../app/admin/ai-agent/page.tsx');
  assert.match(page, /ResponsiveView/);
});
