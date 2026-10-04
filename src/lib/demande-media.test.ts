/* Dépôt de panne multimédia — parcours client sans texte + accès technicien.
 *
 * Exécuté avec Node 24 natif (type stripping, zéro dépendance) :
 *   node --test src/lib/demande-media.test.ts
 * ou : npm run test:unit
 * Vérifications statiques (jamais bundlé, exclu du tsconfig Next).
 * Mêmes règles métier, présentation Desktop/Mobile via classes communes.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel: string): string =>
  readFileSync(new URL(rel, import.meta.url), 'utf8');

void test('client : description obligatoire (≥10), médias facultatifs', () => {
  const wizard = read('../components/client/demande-wizard.tsx');
  assert.match(wizard, /Décrivez votre panne/);
  assert.match(wizard, /demande-description/);
  assert.match(wizard, /DESCRIPTION_MIN_LENGTH = 10/);
  assert.match(wizard, /description\.trim\(\)\.length >= DESCRIPTION_MIN_LENGTH/);
  assert.match(wizard, /Photos \(facultatif\)/);
});

void test('parcours simplifié : catégorie → marque réelle → description, sans modèle', () => {
  const wizard = read('../components/client/demande-wizard.tsx');
  // Ni étape modèle, ni échappatoire « toutes marques / tous modèles ».
  assert.doesNotMatch(wizard, /Toutes les marques/);
  assert.doesNotMatch(wizard, /Tous les modèles/);
  assert.doesNotMatch(wizard, /modelId/);
  assert.doesNotMatch(wizard, /quickOption/);
  // Marque réelle obligatoire avec un domaine du catalogue.
  assert.match(wizard, /brandId !== ''/);
  assert.match(wizard, /Aucune marque disponible/);
  assert.match(wizard, /n'est pas encore disponible sur Relio/);
  // Description transmise à la création.
  assert.match(wizard, /description: description\.trim\(\)/);
});

void test('client : upload réel AVANT création, nettoyage à l’échec', () => {
  const wizard = read('../components/client/demande-wizard.tsx');
  const submit = wizard.slice(wizard.indexOf('const handleSubmit'));
  assert.ok(submit.indexOf('uploadDemandeMedia') < submit.indexOf('createDemande({'));
  assert.match(wizard, /deleteUploadedDemandeMedia/);
  assert.match(wizard, /storagePath/);
});

void test('client : limites explicites (5 fichiers, 25 Mo, vocal 3 min)', () => {
  const wizard = read('../components/client/demande-wizard.tsx');
  assert.match(wizard, /MAX_MEDIAS = 5/);
  assert.match(wizard, /MAX_MEDIA_BYTES = 25 \* 1024 \* 1024/);
  assert.match(wizard, /VOICE_MAX_SECONDS/);
  const recorder = read('../components/client/voice-recorder.tsx');
  assert.match(recorder, /VOICE_MAX_SECONDS = 180/);
  assert.match(recorder, /audio\/webm/);
});

void test('vocal : cycle complet non-bloquant (prêt → record → aperçu → valider/supprimer)', () => {
  const recorder = read('../components/client/voice-recorder.tsx');
  for (const state of ['Enregistrer un message vocal', 'Enregistrement', 'Aperçu', 'Valider ce message', 'Refaire']) {
    assert.ok(recorder.includes(state), state);
  }
  assert.match(recorder, /aria-live="polite"/);
  assert.match(recorder, /min-h-1[12]/);
  assert.match(recorder, /Rien n'est envoyé sans validation/);
});

void test('section technicien/client : players lazy, ordre conservé, états explicites', () => {
  const section = read('../components/mission/demande-media-section.tsx');
  assert.match(section, /Éléments transmis par le client/);
  assert.match(section, /<audio controls/);
  assert.match(section, /<video/);
  assert.match(section, /preload="none"/);
  assert.match(section, /loading="lazy"/);
  assert.match(section, /Aperçu indisponible/);
  assert.match(section, /Aucun élément transmis/);
  assert.doesNotMatch(section, /\.sort\(/);
  const tech = read('../app/technicien/demandes/[id]/page.tsx');
  assert.match(tech, /DemandeMediaSection/);
  assert.match(tech, /getTechnicianDemandeMediaFileUrl/);
  const client = read('../app/client/demandes/[id]/page.tsx');
  assert.match(client, /DemandeMediaSection/);
  assert.doesNotMatch(client, /MediaGallery/);
});

void test('permissions : aucune URL persistée, lecture via endpoint signé', () => {
  const section = read('../components/mission/demande-media-section.tsx');
  assert.doesNotMatch(section, /public\//);
  assert.match(section, /fetchUrl\(demandeId, media\.id\)/);
});

void test('hub catalogue supprimé : ni cadre ni états ni appels restants', () => {
  const page = read('../app/technicien/demandes/[id]/page.tsx');
  assert.doesNotMatch(page, /Choisir un diagnostic/);
  assert.doesNotMatch(page, /getDemandeSuggestions/);
  assert.doesNotMatch(page, /selectDemandeDiagnostic/);
  assert.match(page, /FreeDiagnosticSection/);
});

void test('pré-acceptation : médias affichés et lisibles avant acceptation', () => {
  const page = read('../app/technicien/demandes/[id]/page.tsx');
  // La section médias est hors condition d'assignation (visible en détail
  // d'opportunité éligible comme en mission assignée).
  assert.match(page, /DemandeMediaSection/);
  assert.match(page, /getTechnicianDemandeMediaFileUrl/);
});
