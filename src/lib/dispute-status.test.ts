/* Litige post-intervention — libellés FR + contrats API.
 *
 * Exécuté avec Node 24 natif (type stripping, zéro dépendance) :
 *   node --test src/lib/dispute-status.test.ts
 * ou : npm run test:unit
 * Vérifications statiques (jamais bundlé, exclu du tsconfig Next).
 * Mêmes règles métier, présentation Desktop/Mobile via classes communes.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (rel: string): string =>
  readFileSync(new URL(rel, import.meta.url), 'utf8');

void test('libellés FR : catégories et statuts', () => {
  const lib = read('./dispute-status.ts');
  for (const label of ['Qualité du travail', 'Travail incomplet', 'Tarif contesté', 'Comportement']) {
    assert.ok(lib.includes(label), label);
  }
  for (const label of ['Ouvert', 'En examen', 'Résolu (fondé)', 'Rejeté']) {
    assert.ok(lib.includes(label), label);
  }
  assert.match(lib, /DISPUTE_STATUS_CONFIG/);
  assert.match(lib, /DISPUTE_CATEGORY_LABELS/);
  assert.match(lib, /disputeStatusConfig/);
  assert.match(lib, /disputeCategoryLabel/);
});

void test('contrat client : POST + GET /demandes/:id/dispute', () => {
  const service = read('./api/request-service.ts');
  assert.match(service, /openDispute/);
  assert.match(service, /\/demandes\/\$\{encodeURIComponent/);
  assert.match(service, /\/dispute/);
  assert.match(service, /getDispute/);
});

void test('contrat admin : liste paginée + détail + review', () => {
  const service = read('./api/admin-service.ts');
  assert.match(service, /listAdminDisputes/);
  assert.match(service, /getAdminDispute/);
  assert.match(service, /reviewAdminDispute/);
  assert.match(service, /\/admin\/disputes/);
  assert.match(service, /\/review/);
});

void test('client : contestation proposée sur COMPLETED, litige affiché sinon', () => {
  const page = read('../app/client/demandes/[id]/page.tsx');
  assert.match(page, /getDispute/);
  assert.match(page, /openDispute/);
  assert.match(page, /Contester l'intervention/);
  assert.match(page, /disputeStatusConfig|DISPUTE_STATUS_CONFIG/);
  assert.match(page, /ConfirmDialog/);
});

void test('technicien : litige en lecture seule, jamais de POST', () => {
  const page = read('../app/technicien/demandes/[id]/page.tsx');
  assert.match(page, /getDispute/);
  assert.doesNotMatch(page, /openDispute/);
});

void test('admin : pages litiges liées depuis la navigation', () => {
  assert.ok(existsSync(new URL('../app/admin/litiges/page.tsx', import.meta.url)));
  assert.ok(existsSync(new URL('../app/admin/litiges/[id]/page.tsx', import.meta.url)));
  const layout = read('../app/admin/layout.tsx');
  assert.match(layout, /href: '\/admin\/litiges', label: 'Litiges'/);
  const list = read('../app/admin/litiges/page.tsx');
  assert.match(list, /listAdminDisputes/);
  assert.match(list, /ResponsiveView/);
  const detail = read('../app/admin/litiges/[id]/page.tsx');
  assert.match(detail, /reviewAdminDispute/);
});

void test('aucun window.innerWidth hors mécanisme central', () => {
  for (const rel of [
    '../app/admin/litiges/page.tsx',
    '../app/admin/litiges/[id]/page.tsx',
    '../app/client/demandes/[id]/page.tsx',
    '../app/technicien/demandes/[id]/page.tsx',
  ]) {
    assert.doesNotMatch(read(rel), /window\.innerWidth/);
  }
});
