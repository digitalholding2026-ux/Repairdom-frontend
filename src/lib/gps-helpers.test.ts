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
  formatTravelAccuracyShort,
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
    '../components/client/demande-wizard.tsx',
    '../components/mission/mission-map-inner.tsx',
    './api/technician-service.ts',
  ];
  for (const file of files) {
    const content = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.doesNotMatch(content, /\.watchPosition\(/);
    assert.doesNotMatch(content, /new WebSocket/);
  }
});

/* GPS V4.1 — meilleure précision native via le helper unique (y compris
 * la demande client opt-in), précision réelle affichée, relief Plan/Relief
 * avec repli ciblé. Aucun tracking, aucune coordonnée dans les logs. */

void test('V4.1 : helper unique partout (zones + wizard, maximumAge 0)', async () => {
  const { readFileSync } = await import('node:fs');
  const helper = readFileSync(new URL('./travel-location.ts', import.meta.url), 'utf8');
  assert.match(helper, /enableHighAccuracy: true/);
  assert.match(helper, /maximumAge: 0/);
  for (const file of [
    '../app/technicien/zones/page.tsx',
    '../components/client/demande-wizard.tsx',
  ]) {
    const content = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.match(content, /getCurrentTravelPosition/);
    assert.doesNotMatch(content, /navigator\.geolocation\.getCurrentPosition\(/);
    assert.doesNotMatch(content, /maximumAge: 60000/);
  }
});

void test('V4.1 : précision courte réelle, jamais fictive', async () => {
  assert.equal(formatTravelAccuracyShort(18), '~18 m');
  assert.equal(formatTravelAccuracyShort(18.4), '~18 m');
  assert.equal(formatTravelAccuracyShort(null), null);
  assert.equal(formatTravelAccuracyShort(undefined), null);
  assert.equal(formatTravelAccuracyShort(Number.NaN), null);
  assert.equal(formatTravelAccuracyShort(-3), null);
  // Le wizard n'affiche la précision que si le navigateur l'a fournie.
  const wizard = await import('node:fs').then((fs) =>
    fs.readFileSync(
      new URL('../components/client/demande-wizard.tsx', import.meta.url),
      'utf8',
    ),
  );
  assert.match(wizard, /Précision estimée/);
});

void test('V4.1 : carte Plan/Relief (OpenTopoMap, attribution, repli ciblé)', async () => {
  const { readFileSync } = await import('node:fs');
  const map = readFileSync(
    new URL('../components/mission/mission-map-inner.tsx', import.meta.url),
    'utf8',
  );
  assert.match(map, /name="Plan"/);
  assert.match(map, /name="Relief"/);
  assert.match(map, /tile\.opentopomap\.org/);
  assert.match(map, /OpenStreetMap/);
  assert.match(map, /opentopomap\.org/);
  assert.match(map, /maxZoom=\{17\}/);
  assert.match(map, /baselayerchange/);
  assert.match(map, /role="region"/);
  assert.match(map, /aria-label="Carte de la mission/);
  assert.doesNotMatch(map, /\.watchPosition\(/);
});

void test('V4.1 : aucun log de coordonnées, aucune ETA', async () => {
  const { readFileSync } = await import('node:fs');
  const files = [
    './travel-location.ts',
    '../components/client/demande-wizard.tsx',
    '../components/mission/mission-map-inner.tsx',
    '../components/mission/travel-section.tsx',
  ];
  for (const file of files) {
    const content = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.doesNotMatch(content, /console\.(log|debug|info)/);
    assert.doesNotMatch(content, /\bETA\b/);
  }
});
