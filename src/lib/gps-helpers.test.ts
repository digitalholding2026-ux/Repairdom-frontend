/* CHANTIER GPS P0/P1 — tests unitaires des helpers GPS déplacement.
 *
 * Exécuté avec Node 24 natif (type stripping, zéro dépendance) :
 *   node --test src/lib/gps-helpers.test.ts
 * ou : npm run test:unit
 * Imports avec extension `.ts` explicite (exigée par Node) ; ce fichier
 * est exclu du tsconfig Next (jamais bundlé). Aucun tracking, aucun réseau.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRAVEL_MAX_ACCURACY_M,
  formatTravelAccuracy,
  formatTravelDistance,
  formatTravelRecency,
  gpsDegradedMessage,
  gpsErrorMessage,
  gpsInaccurateMessage,
  isUsableTravelAccuracy,
} from './travel-location.ts';

void test('accuracy : seuil 500 m, null = exploitable (compatibilité)', () => {
  assert.equal(TRAVEL_MAX_ACCURACY_M, 500);
  assert.equal(isUsableTravelAccuracy(25), true);
  assert.equal(isUsableTravelAccuracy(500), true);
  assert.equal(isUsableTravelAccuracy(501), false);
  assert.equal(isUsableTravelAccuracy(2000), false);
  assert.equal(isUsableTravelAccuracy(null), true);
  assert.equal(isUsableTravelAccuracy(undefined), true);
  assert.equal(isUsableTravelAccuracy(Number.NaN), false);
  assert.equal(isUsableTravelAccuracy(-5), false);
});

void test('zones : helper central unique (pas de getCurrentPosition parallèle)', async () => {
  const source = await import('node:fs').then((fs) =>
    fs.readFileSync(new URL('./travel-location.ts', import.meta.url), 'utf8'),
  );
  assert.match(source, /getCurrentTravelPosition/);
  assert.doesNotMatch(source, /\.watchPosition\(/);
  const zones = await import('node:fs').then((fs) =>
    fs.readFileSync(new URL('../app/technicien/zones/page.tsx', import.meta.url), 'utf8'),
  );
  assert.match(zones, /getCurrentTravelPosition/);
  assert.doesNotMatch(zones, /navigator\.geolocation\.getCurrentPosition\(/);
  assert.doesNotMatch(zones, /\.watchPosition\(/);
});

void test('UX : messages non bloquants, jamais de coordonnées brutes', () => {
  assert.match(gpsDegradedMessage(), /continuer sans GPS/);
  assert.match(gpsInaccurateMessage(), /trop imprécise/);
  assert.match(gpsErrorMessage('denied'), /refusée/);
  assert.match(gpsErrorMessage('timeout'), /trop lente/);
  for (const message of [gpsDegradedMessage(), gpsInaccurateMessage()]) {
    assert.doesNotMatch(message, /-?\d+\.\d+/);
  }
});

void test('affichage : précision/distance/récence, jamais de 0 forcé', () => {
  assert.equal(formatTravelAccuracy(25), 'précision ~25 m');
  assert.equal(formatTravelAccuracy(null), null);
  assert.equal(formatTravelAccuracy(undefined), null);
  assert.equal(formatTravelDistance(850), 'à ~850 m');
  assert.equal(formatTravelDistance(null), null);
  assert.equal(formatTravelDistance(undefined), null);
  assert.equal(formatTravelRecency(0), "à l'instant");
  assert.equal(formatTravelRecency(5), 'il y a 5 min');
  assert.equal(formatTravelRecency(20), 'il y a 20 min');
  assert.equal(formatTravelRecency(null), null);
  assert.equal(formatTravelRecency(-3), null);
});

void test('sécurité : aucun tracking (watchPosition/WebSocket/historique)', async () => {
  const { readFileSync } = await import('node:fs');
  const files = [
    './travel-location.ts',
    '../components/mission/travel-section.tsx',
    '../app/technicien/zones/page.tsx',
    './api/technician-service.ts',
  ];
  for (const file of files) {
    const content = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.doesNotMatch(content, /\.watchPosition\(/);
    assert.doesNotMatch(content, /new WebSocket/);
  }
});
