/* Helper formatFCFA : XAF entier -> "5 000 FCFA" (insécable).
 *   node --test src/lib/format-fcfa.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { formatFCFA } from './format-fcfa.ts';

const NBSP = String.fromCharCode(160);

void test('formatFCFA : montants entiers en FCFA', () => {
  assert.equal(formatFCFA(5000), `5${NBSP}000 FCFA`);
  assert.equal(formatFCFA(15000), `15${NBSP}000 FCFA`);
  assert.equal(formatFCFA(0), `0 FCFA`);
});

void test('formatFCFA : arrondi et valeurs vides', () => {
  assert.equal(formatFCFA(2500.6), `2${NBSP}501 FCFA`);
  assert.equal(formatFCFA(null), '—');
  assert.equal(formatFCFA(undefined), '—');
  assert.equal(formatFCFA(Number.NaN), '—');
});
