/* CHANTIER DESIGN UI/UX P2/P3 — cohérence du design system.
 *
 * Exécuté avec Node 24 natif (type stripping, zéro dépendance) :
 *   node --test src/lib/design-system.test.ts
 * ou : npm run test:unit
 * Vérifications statiques (jamais bundlé, exclu du tsconfig Next).
 * Identité réelle du projet : orange ambré (#F97316/#FB923C, tokens
 * `relio-orange`), surfaces sombres (#0B0D12), tokens sémantiques
 * (success/warning/error/info/muted). Aucune opération réelle.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../', import.meta.url));

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue;
      walk(full, out);
    } else if (entry.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

const FILES = walk(SRC);
const read = (abs: string): string => readFileSync(abs, 'utf8');
const rel = (abs: string): string => relative(SRC, abs).replace(/\\/g, '/');

/* Couleurs arbitraires autorisées (artwork/logo SVG, halos décoratifs,
 * marqueurs carto, marques opérateurs MTN/Orange, surfaces sombres #0F172A
 * partagées) : toute autre occurrence `bg-[#…]` / `text-[#…]` est un écart.
 * Les tokens `relio-orange` / `relio-bg` couvrent l'identité. */
const HEX_ALLOWLIST = new Set([
  'components/mission/mission-map-inner.tsx',
  'components/ui/logo.tsx',
  'components/client/parrainage/parrainage-overview.tsx',
  'components/ui/gradient-hero-card.tsx',
  'components/ui/reward-progress-card.tsx',
  'components/client/recompenses/reward-catalog.tsx',
]);

void test('tokens : aucune couleur hex arbitraire hors allowlist documentée', () => {
  const offenders: string[] = [];
  for (const file of FILES) {
    const name = rel(file);
    if (HEX_ALLOWLIST.has(name)) continue;
    const lines = read(file).split('\n');
    lines.forEach((line, i) => {
      if (/bg-\[#[0-9a-fA-F]{3,8}\]|text-\[#[0-9a-fA-F]{3,8}\]/.test(line)) {
        offenders.push(`${name}:${i + 1}`);
      }
    });
  }
  assert.deepEqual(offenders, []);
});

void test('tokens : identité via relio-orange / relio-bg (jamais #FF6B00 / #0B0D12 en dur)', () => {
  for (const file of FILES) {
    const content = read(file);
    if (HEX_ALLOWLIST.has(rel(file))) continue;
    assert.doesNotMatch(content, /#FF6B00/);
    assert.doesNotMatch(content, /#0B0D12/);
  }
});

void test('sémantique : statuts et danger via tokens (jamais d’échelles brutes)', () => {
  const dashboard = read(join(SRC, 'components/client/dashboard/client-home-blocks.tsx'));
  assert.doesNotMatch(dashboard, /bg-blue-100/);
  assert.doesNotMatch(dashboard, /bg-green-100/);
  assert.match(dashboard, /bg-info-soft/);
  assert.match(dashboard, /bg-success-soft/);
  const profil = read(join(SRC, 'app/client/profil/page.tsx'));
  assert.doesNotMatch(profil, /bg-red-50/);
  assert.match(profil, /bg-error-soft/);
});

void test('accessibilité : carte GPS nommée, bouton Plus nommé', () => {
  const map = read(join(SRC, 'components/mission/mission-map-inner.tsx'));
  assert.match(map, /role="region"/);
  assert.match(map, /aria-label="Carte de la mission/);
  const nav = read(join(SRC, 'components/ui/bottom-nav.tsx'));
  assert.match(nav, /aria-label="Plus de sections"/);
});

void test('images : <img> uniquement pour URLs dynamiques (jamais de statique)', () => {
  const offenders: string[] = [];
  for (const file of FILES) {
    const lines = read(file).split('\n');
    lines.forEach((line, i) => {
      const m = line.match(/<img[^>]*src=\{?["']([^"'}]+)["']\}?/);
      // src dynamique (variable) = OK ; src littéral statique = migrer vers next/image.
      if (m && !m[1].startsWith('/') && !m[1].includes('{') && !m[0].includes('{')) {
        offenders.push(`${rel(file)}:${i + 1}`);
      }
    });
  }
  assert.deepEqual(offenders, []);
});

void test('branding : aucune référence RepairDom visible (contrat repairDomRevenue excepté)', () => {
  const offenders: string[] = [];
  for (const file of FILES) {
    const lines = read(file).split('\n');
    lines.forEach((line, i) => {
      if (/repairdom/i.test(line) && !/repairdomrevenue/i.test(line)) {
        offenders.push(`${rel(file)}:${i + 1}: ${line.trim().slice(0, 80)}`);
      }
    });
  }
  assert.deepEqual(offenders, []);
});

void test('boutons : hauteurs tactiles (44 px sur md/lg via h-11/h-12)', () => {
  const button = read(join(SRC, 'components/ui/button.tsx'));
  assert.match(button, /md: 'h-11/);
  assert.match(button, /lg: 'h-12/);
  assert.match(button, /disabled:opacity-50/);
  assert.match(button, /aria-busy/);
});
