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

void test('wizard Autre : indice structuré obligatoire, jamais de texte libre', () => {
  const wizard = read('../components/client/demande-wizard.tsx');
  assert.match(wizard, /Quel type d&apos;appareil souhaitez-vous faire réparer/);
  assert.match(wizard, /listEquipmentFamilies\(\)/);
  assert.match(wizard, /equipmentFamily\.trim\(\) !== ''/);
  assert.match(wizard, /equipmentFamily: equipmentFamily\.trim\(\)/);
  assert.doesNotMatch(wizard, /EQUIPMENT_MAX_LENGTH/);
  assert.doesNotMatch(wizard, /id="demande-equipment-type"/);
  assert.doesNotMatch(wizard, /diagnostic IA/i);
  assert.doesNotMatch(wizard, /OpenRouter|openrouter|transcription/i);
});

void test('wizard : « Je ne sais pas » reste une option de la même liste', () => {
  const wizard = read('../components/client/demande-wizard.tsx');
  assert.doesNotMatch(wizard, /Toutes les marques/);
  assert.doesNotMatch(wizard, /Tous les modèles/);
  assert.match(wizard, /EquipmentFamilyLite/);
});

void test('service : equipmentFamily transmis (omis si vide), types alignés', () => {
  const service = read('./api/request-service.ts');
  assert.match(service, /equipmentFamily\?: string;/);
  assert.match(service, /\{ equipmentFamily: input\.equipmentFamily\.trim\(\) \}/);
  const tech = read('./api/technician-service.ts');
  assert.match(tech, /equipmentFamily\?: string \| null;/);
});

void test('technicien : « Appareil : X (déclaré par le client) », famille prioritaire', () => {
  const page = read('../app/technicien/demandes/[id]/page.tsx');
  assert.match(page, /demande\.equipmentFamily/);
  assert.match(page, /déclaré par le client/);
  assert.doesNotMatch(page, /equipmentFamily[^}]*diagnostic IA/i);
});
