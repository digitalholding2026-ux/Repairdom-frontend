/* Modale : le focus ne doit jamais voler le curseur de saisie.
 * Régression : l'effet focus-trap dépendait de `onClose` (flèche inline
 * recréée à chaque render) → chaque frappe rejouait `panel.focus()`.
 * L'effet ne dépend que de `open`, `onClose` passe par une ref.
 *   node --test src/lib/modal-focus.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel: string): string =>
  readFileSync(new URL(rel, import.meta.url), 'utf8');

void test('modale : effet focus indépendant des renders (pas de vol de curseur)', () => {
  const src = read('../components/ui/modal.tsx');
  assert.match(src, /onCloseRef/);
  assert.match(src, /\}, \[open\]\);/);
  assert.doesNotMatch(src, /\[open, onClose\]/);
});
