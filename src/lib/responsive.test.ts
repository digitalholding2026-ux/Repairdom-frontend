/* CHANTIER UI DESKTOP & MOBILE — mécanisme central + séparation pilote.
 *
 * Exécuté avec Node 24 natif (type stripping, zéro dépendance) :
 *   node --test src/lib/responsive.test.ts
 * ou : npm run test:unit
 * Vérifications statiques (jamais bundlé, exclu du tsconfig Next).
 * Le hook React lui-même est validé par `tsc` + revue (pas de DOM de test
 * dans ce projet) ; ici : contrat, SSR-safety, isolation des vues.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel: string): string =>
  readFileSync(new URL(rel, import.meta.url), 'utf8');

void test('mécanisme unique : useViewport + ResponsiveView (jamais innerWidth dispersé)', () => {
  const hook = read('./use-viewport.ts');
  assert.match(hook, /DESKTOP_MEDIA_QUERY/);
  assert.match(hook, /\(min-width: 1024px\)/);
  assert.match(hook, /matchMedia/);
  assert.match(hook, /mounted/);
  // `window.innerWidth` en code (hors commentaires/backticks de doc).
  assert.doesNotMatch(hook, /(?<!`)window\.innerWidth/);
  const view = read('../components/ui/responsive-view.tsx');
  assert.match(view, /useViewport/);
  assert.match(view, /!mounted/);
  assert.match(view, /isDesktop \? desktop : mobile/);
  // Une seule vue montée (jamais deux arbres simultanés, §29).
  assert.doesNotMatch(view, /isDesktop &&/);
});

void test('aucun window.innerWidth hors mécanisme central', async () => {
  const { readdirSync, statSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const src = fileURLToPath(new URL('../', import.meta.url));
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === 'node_modules' || entry === '.next') continue;
        walk(full, out);
      } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
        // Les tests eux-mêmes citent le motif interdit dans leurs assertions.
        if (entry.endsWith('.test.ts') || entry.endsWith('.test.tsx')) continue;
        out.push(full);
      }
    }
    return out;
  };
  const offenders: string[] = [];
  for (const file of walk(src)) {
    if (file.endsWith('use-viewport.ts')) continue;
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (/window\.innerWidth|window\.outerWidth/.test(line)) {
        offenders.push(`${file}:${i + 1}`);
      }
    });
  }
  assert.deepEqual(offenders, []);
});

void test('pilote dashboard : données partagées, vues isolées', () => {
  const hook = read('../components/client/dashboard/use-client-dashboard-data.ts');
  assert.match(hook, /export function useClientDashboardData/);
  assert.match(hook, /listMyDemandes/);
  assert.match(hook, /getClientFinanceSummary/);
  for (const rel of [
    '../components/client/dashboard/client-home-mobile-view.tsx',
    '../components/client/dashboard/client-home-desktop-view.tsx',
  ]) {
    const view = read(rel);
    // Les vues ne fetchent jamais : données via props du hook partagé.
    assert.doesNotMatch(view, /listMyDemandes|getClientFinanceSummary|getMe\(/);
    assert.match(view, /ClientDashboardData/);
  }
  const mobile = read('../components/client/dashboard/client-home-mobile-view.tsx');
  const desktop = read('../components/client/dashboard/client-home-desktop-view.tsx');
  // Mêmes destinations métier dans les deux vues (mêmes données).
  for (const href of ['/client/demande', '/client/demandes', '/client/solde', '/client/notifications']) {
    assert.ok(mobile.includes(href), `mobile : ${href}`);
    assert.ok(desktop.includes(href), `desktop : ${href}`);
  }
  // Desktop : composition multi-colonnes claire, pas de hero sombre dominant.
  assert.match(desktop, /xl:grid-cols-3/);
  assert.doesNotMatch(desktop, /bg-slate-950/);
  // Mobile : ordre tactile conservé (pas de grille desktop).
  assert.doesNotMatch(mobile, /xl:grid-cols-3/);
});

void test('navigation : sidebar desktop ET BottomNav mobile isolés par rôle', () => {
  for (const rel of ['../app/client/layout.tsx', '../app/technicien/layout.tsx']) {
    const layout = read(rel);
    assert.match(layout, /WorkspaceSidebar/);
    assert.match(layout, /BottomNav/);
    assert.match(layout, /lg:hidden/);
  }
});
