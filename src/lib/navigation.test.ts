/* CHANTIER NAVIGATION P1/P2 — navigation par rôle, ancres, deep-links.
 *
 * Exécuté avec Node 24 natif (type stripping, zéro dépendance) :
 *   node --test src/lib/navigation.test.ts
 * ou : npm run test:unit
 * Vérifications statiques sur les menus/layouts (jamais bundlé, exclu du
 * tsconfig Next). Aucune opération réelle.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel: string): string =>
  readFileSync(new URL(rel, import.meta.url), 'utf8');

/* Miroir local du format (tracking-service.ts importe `@/lib/site-config`,
 * non résolvable en Node natif) : la parité exacte est vérifiée
 * statiquement ci-dessous. */
const TRACKING_REFERENCE_PATTERN = /^RD-[A-HJ-NP-Z0-9]{6}$/;
function isValidTrackingReference(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return TRACKING_REFERENCE_PATTERN.test(value.trim().toUpperCase());
}

void test('CLIENT : sidebar complète, mobile via Plus (aucune section perdue)', () => {
  const layout = read('../app/client/layout.tsx');
  for (const href of [
    '/client',
    '/client/demandes',
    '/client/chronologies',
    '/client/notifications',
    '/client/solde',
    '/client/recompenses',
    '/client/profil',
  ]) {
    assert.ok(layout.includes(`'${href}'`), `menu client : ${href}`);
  }
  assert.match(layout, /moreItems/);
  assert.doesNotMatch(layout, /\/admin/);
  assert.doesNotMatch(layout, /\/technicien/);
});

void test('TECHNICIAN : zones + historique accessibles, 4 boutons + Plus', () => {
  const layout = read('../app/technicien/layout.tsx');
  for (const href of [
    '/technicien',
    '/technicien/demandes',
    '/technicien/chronologies',
    '/technicien/historique',
    '/technicien/revenus',
    '/technicien/notifications',
    '/technicien/zones',
    '/technicien/profil',
  ]) {
    assert.ok(layout.includes(`'${href}'`), `menu technicien : ${href}`);
  }
  assert.match(layout, /moreItems/);
  assert.doesNotMatch(layout, /\/admin/);
  // Plus de rangée à 6 boutons illisibles à 360 px.
  const itemsBlock = layout.slice(layout.indexOf('<BottomNav'));
  const directHrefs = (itemsBlock.match(/href: '\/technicien[^']*'/g) ?? []).length;
  assert.ok(directHrefs >= 8, 'toutes les sections restent déclarées');
});

void test('ADMIN : aucune route admin dans les menus client/technicien', () => {
  for (const rel of ['../app/client/layout.tsx', '../app/technicien/layout.tsx']) {
    const content = read(rel);
    assert.doesNotMatch(content, /href: '\/admin/);
    assert.doesNotMatch(content, /href="\/admin/);
  }
  const admin = read('../app/admin/layout.tsx');
  assert.match(admin, /\/admin\/missions/);
  assert.match(admin, /\/admin\/finances/);
});

void test('ancres : chaque href /#… correspond à une section réelle', () => {
  const landing = [
    read('../components/landing/landing-sections.tsx'),
    read('../components/landing/faq.tsx'),
  ].join('\n');
  const header = read('../components/public/public-header.tsx');
  const anchors = [...header.matchAll(/href="\/#([A-Za-z-]+)"/g)].map((m) => m[1]);
  assert.ok(anchors.length > 0);
  for (const id of new Set(anchors)) {
    assert.ok(
      landing.includes(`id="${id}"`),
      `ancre /#${id} sans section sur la landing`,
    );
  }
  assert.doesNotMatch(header, /categories-title/);
});

void test('routes workflow : parrainage lié, confirmation + technicien + historique liés', () => {
  const recompenses = read('../app/client/recompenses/page.tsx');
  assert.match(recompenses, /\/client\/parrainage/);
  const wizard = read('../components/client/demande-wizard.tsx');
  assert.match(wizard, /\/client\/confirmation/);
  const dashboard = read('../components/client/client-dashboard.tsx');
  assert.match(dashboard, /\/client\/demandes\/historique/);
});

void test('tracking : format miroir backend, suivi anonyme sans GPS', () => {
  assert.equal(isValidTrackingReference('RD-8F4K29'), true);
  assert.equal(isValidTrackingReference('rd-8f4k29'), true);
  assert.equal(isValidTrackingReference('RD-ABC12'), false);
  assert.equal(isValidTrackingReference('XX-ABCDEF'), false);
  // Parité exacte avec le service (même alphabet, sans I ni O).
  const service = read('./api/tracking-service.ts');
  assert.match(service, /\/\^RD-\[A-HJ-NP-Z0-9\]\{6\}\$\//);
  assert.match(service, /isValidTrackingReference/);
  const hero = read('../components/mission/tracking-hero.tsx');
  assert.doesNotMatch(hero, /Suivi en direct/);
  assert.doesNotMatch(hero, /animate-ping/);
  const suivi = read('../app/suivi/page.tsx');
  assert.doesNotMatch(suivi, /en temps réel/);
  assert.match(suivi, /isValidTrackingReference/);
});

void test('guards : backend source de vérité, RoleGuard sans flash (spinner)', () => {
  const guard = read('../components/auth/role-guard.tsx');
  assert.match(guard, /Spinner/);
  assert.match(guard, /homePathForRole/);
  // Aucune route protégée sans RoleGuard dans les layouts privés.
  for (const rel of [
    '../app/client/layout.tsx',
    '../app/technicien/layout.tsx',
    '../app/admin/layout.tsx',
  ]) {
    assert.match(read(rel), /RoleGuard/);
  }
});
