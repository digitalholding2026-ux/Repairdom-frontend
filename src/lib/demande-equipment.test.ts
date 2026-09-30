/* IA-4.1 — équipement déclaré obligatoire si « Autre » (objet à réparer,
 * pas la panne ; multimédia inchangé ; jamais un diagnostic catalogue).
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

void test('wizard Autre : champ équipement obligatoire, vocabulaire objet (pas panne/diagnostic)', () => {
  const wizard = read('../components/client/demande-wizard.tsx');
  assert.match(wizard, /Quel appareil ou équipement souhaitez-vous faire réparer \?/);
  assert.match(wizard, /Ex\. : réfrigérateur, climatiseur, machine à laver…/);
  assert.match(wizard, /Indiquez simplement le type d’appareil ou d’équipement, pas la panne\./);
  assert.match(wizard, /EQUIPMENT_MAX_LENGTH = 120/);
  assert.match(wizard, /domainId === OTHER_DOMAIN.{0,80}equipmentType\.trim\(\) !== ''/);
  assert.match(wizard, /equipmentType: equipmentType\.trim\(\)/);
  assert.doesNotMatch(wizard, /diagnostic IA/i);
  assert.doesNotMatch(wizard, /OpenRouter|openrouter|transcription/i);
});

void test('wizard : domaines normaux et multimédia inchangés', () => {
  const wizard = read('../components/client/demande-wizard.tsx');
  assert.match(wizard, /Montrez votre panne à l’étape suivante/);
  assert.match(wizard, /medias\.length > 0/);
  assert.match(wizard, /setEquipmentType\(''\)/);
});

void test('service : equipmentType transmis (omis si vide), types alignés', () => {
  const service = read('./api/request-service.ts');
  assert.match(service, /equipmentType\?: string;/);
  assert.match(service, /\.\.\.\(input\.equipmentType\?\.trim\(\) \? \{ equipmentType: input\.equipmentType\.trim\(\) \} : \{\}\)/);
  const tech = read('./api/technician-service.ts');
  assert.match(tech, /equipmentType\?: string \| null;/);
});

void test('technicien : « Appareil : X (déclaré par le client) », jamais un diagnostic', () => {
  const page = read('../app/technicien/demandes/[id]/page.tsx');
  assert.match(page, /Appareil : \{demande\.equipmentType\}/);
  assert.match(page, /déclaré par le client/);
  assert.doesNotMatch(page, /equipmentType[^}]*diagnostic IA/i);
});
