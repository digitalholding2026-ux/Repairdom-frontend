/* IA-4 — choix « Autre » préservé côté client, aucune UI IA exposée.
 *
 * Exécuté avec Node 24 natif (type stripping, zéro dépendance) :
 *   node --test src/lib/ai-classification.test.ts
 * ou : npm run test:unit
 * Vérifications statiques (jamais bundlé, exclu du tsconfig Next).
 * La classification vit côté backend ; le client choisit simplement Autre.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../', import.meta.url));
const read = (rel: string): string =>
  readFileSync(new URL(rel, import.meta.url), 'utf8');

void test('Autre : parcours client inchangé (catégorie autre, sans UI IA)', () => {
  const wizard = read('../components/client/demande-wizard.tsx');
  assert.match(wizard, /categoryId: categoryId \|\| 'autre'/);
  assert.match(wizard, /Autre appareil/);
  assert.doesNotMatch(wizard, /OpenRouter|openrouter|AiGateway|intelligence artificielle/i);
});

void test('frontend : aucune clé ni appel OpenRouter, aucune mention modèle', () => {
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === 'node_modules' || entry === '.next') continue;
        walk(full, out);
      } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
        if (entry.endsWith('.test.ts')) continue;
        out.push(full);
      }
    }
    return out;
  };
  const offenders: string[] = [];
  for (const file of walk(SRC)) {
    const content = readFileSync(file, 'utf8');
    if (/OPENROUTER_API_KEY|sk-or-[A-Za-z0-9]|openrouter\.ai/i.test(content)) {
      offenders.push(file);
    }
  }
  assert.deepEqual(offenders, []);
});
