/* Parcours « Autre appareil » — l'indice structuré (famille) est obligatoire
 * à la place du texte libre historique. Description libre inchangée.
 *
 * Exécuté avec Node 24 natif (type stripping, zéro dépendance) :
 *   node --test src/lib/demande-equipment.test.ts
 * ou : npm run test:unit
 * Vérifications statiques (jamais bundlé, exclu du tsconfig Next).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel: string): string =>
  readFileSync(new URL(rel, import.meta.url), 'utf8');

void test('wizard M1 : service → catégorie → item, jamais de famille legacy', () => {
  const wizard = read('../components/client/demande-wizard.tsx');
  assert.match(wizard, /CatalogServicePicker/);
  assert.match(wizard, /selectedItemId/);
  assert.doesNotMatch(wizard, /listEquipmentFamilies\(\)/);
  assert.doesNotMatch(wizard, /EquipmentFamilyLite/);
  assert.doesNotMatch(wizard, /diagnostic IA/i);
  assert.doesNotMatch(wizard, /OpenRouter|openrouter|transcription/i);
});

void test('wizard M1 : le parcours famille legacy a ete supprime', () => {
  const wizard = read('../components/client/demande-wizard.tsx');
  assert.doesNotMatch(wizard, /Toutes les marques/);
  assert.doesNotMatch(wizard, /Tous les modèles/);
  assert.doesNotMatch(wizard, /EquipmentFamilyLite/);
});

void test('service : equipmentFamily transmis (omis si vide), types alignés', () => {
  const service = read('./api/request-service.ts');
  assert.match(service, /equipmentFamily\?: string;/);
  assert.match(service, /\{ equipmentFamily: input\.equipmentFamily\.trim\(\) \}/);
  const tech = read('./api/technician-service.ts');
  assert.match(tech, /equipmentFamily\?: string \| null;/);
});
