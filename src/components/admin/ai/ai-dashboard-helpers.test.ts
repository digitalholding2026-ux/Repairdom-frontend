/* IA-9 — aides du dashboard IA admin (node:test natif, zéro dépendance).
 *
 * Exécuté via : npm run test:unit
 * Vérifie les libellés factuels : aucun score global, niveau 3 = réexamen
 * humain (jamais une suspension ni une qualification du technicien). */

import test from 'node:test';
import assert from 'node:assert/strict';
import { categoryLabel, signalBadge, surveillanceLevelText } from './ai-dashboard-helpers.ts';

test('badges IA-4/IA-5 : libellés factuels, inconnu replié sans crash', () => {
  assert.deepEqual(signalBadge('classification', 'CLASSIFIED'), { label: 'Classifié', variant: 'success' });
  assert.deepEqual(signalBadge('classification', 'MATCHED'), { label: 'Apparié', variant: 'success' });
  assert.deepEqual(signalBadge('classification', 'UNMATCHED'), { label: 'Non apparié', variant: 'neutral' });
  assert.deepEqual(signalBadge('classification', 'BOGUS'), { label: 'BOGUS', variant: 'neutral' });
});

test('badges IA-6 : résultats tarifaires en XAF-ready, sans jugement', () => {
  assert.deepEqual(signalBadge('pricing', 'ABOVE_MAX'), { label: 'Au-dessus du max', variant: 'warning' });
  assert.deepEqual(signalBadge('pricing', 'NORMAL'), { label: 'Normal', variant: 'success' });
  const label = signalBadge('pricing', 'ABOVE_MAX').label.toLowerCase();
  for (const banned of ['fraude', 'abusif', 'sanction']) assert.ok(!label.includes(banned));
});

test('badges IA-7/IA-8 : statuts et sévérités', () => {
  assert.deepEqual(signalBadge('warning', 'EXPIRED'), { label: 'Délai dépassé', variant: 'info' });
  assert.deepEqual(signalBadge('flag', 'DISMISSED'), { label: 'Écarté', variant: 'success' });
  assert.deepEqual(signalBadge('severity', 'HIGH'), { label: 'Haute', variant: 'danger' });
});

test('catégories IA-8 : libellés FR, repli identité', () => {
  assert.equal(categoryLabel('OFF_PLATFORM_PAYMENT'), 'Paiement hors plateforme');
  assert.equal(categoryLabel('UNKNOWN_CAT'), 'UNKNOWN_CAT');
});

test('niveau de surveillance : factuel, niveau 3 = réexamen humain', () => {
  assert.ok(surveillanceLevelText(0).startsWith('Niveau 0'));
  assert.ok(surveillanceLevelText(3).includes('réexamen humain requis'));
  const text = `${surveillanceLevelText(3)} ${surveillanceLevelText(2)}`.toLowerCase();
  for (const banned of ['dangereux', 'risque', 'suspendu', '87/100']) assert.ok(!text.includes(banned));
});
