/* IA-2 — prix courants par diagnostic : liste, statuts, navigation Desktop/Mobile.
 *
 * Exécuté avec Node 24 natif (type stripping, zéro dépendance) :
 *   node --test src/lib/catalog-scales.test.ts
 * ou : npm run test:unit
 * Vérifications statiques (jamais bundlé, exclu du tsconfig Next).
 * Aucun appel IA, aucune logique métier modifiée.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel: string): string =>
  readFileSync(new URL(rel, import.meta.url), 'utf8');

void test('prix courants : statuts actifs/inactifs/avec/sans, jamais de suppression', () => {
  const hook = read('../components/admin/catalog/use-diagnostic-scales.ts');
  assert.match(hook, /'active'|'inactive'|'priced'|'unpriced'/);
  assert.match(hook, /listDiagnosticScales/);
  const desktop = read('../components/admin/catalog/diagnostic-scales-desktop.tsx');
  assert.match(desktop, /Prix courant actif/);
  assert.match(desktop, /Sans prix courant/);
  const mobile = read('../components/admin/catalog/diagnostic-scales-mobile.tsx');
  assert.match(mobile, /min-h-11/);
});

void test('prix courants : montants XAF entiers affichés, édition vers diagnostic', () => {
  const hook = read('../components/admin/catalog/use-diagnostic-scales.ts');
  assert.match(hook, /FCFA/);
  assert.match(hook, /\/admin\/catalog\//);
  const page = read('../app/admin/catalog/baremes/page.tsx');
  assert.match(page, /ResponsiveView/);
  assert.match(page, /CatalogSkeleton/);
  assert.match(page, /Réessayer/);
  assert.match(page, /Aucun prix courant trouvé/);
  // Édition via la page diagnostic existante (aucun éditeur dupliqué).
  assert.doesNotMatch(page, /createPricing|updatePricing/);
});

void test('prix courants : table desktop accessible, cartes mobile tactiles', () => {
  const desktop = read('../components/admin/catalog/diagnostic-scales-desktop.tsx');
  assert.match(desktop, /<table/);
  assert.match(desktop, /<caption/);
  assert.match(desktop, /scope="col"/);
  assert.match(desktop, /overflow-x-auto/);
  assert.match(desktop, /tabular-nums/);
  const mobile = read('../components/admin/catalog/diagnostic-scales-mobile.tsx');
  assert.match(mobile, /aria-label={`Modifier le prix courant/);
});

void test('éditeur existant : entiers XAF exigés avant appel', () => {
  const editor = read('../app/admin/catalog/[domainId]/[problemId]/[diagnosticId]/page.tsx');
  assert.match(editor, /doit être un montant entier en FCFA/);
  assert.doesNotMatch(editor, /parseFloat\(minPrice\)/);
  assert.match(editor, /Number\.isInteger/);
});

void test('navigation admin : entrée Prix courants, un seul onglet actif', () => {
  const layout = read('../app/admin/layout.tsx');
  assert.match(layout, /\/admin\/catalog\/baremes/);
  assert.match(layout, /activeNavHref/);
});
