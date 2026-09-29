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

void test('client : aucun champ texte obligatoire, ≥1 média exigé', () => {
  const wizard = read('../components/client/demande-wizard.tsx');
  assert.doesNotMatch(wizard, /Décrivez le problème/);
  assert.doesNotMatch(wizard, /MIN_DESCRIPTION_LENGTH/);
  assert.doesNotMatch(wizard, /demande-description/);
  assert.match(wizard, /medias\.length > 0/);
  assert.match(wizard, /Ajoutez un message vocal, une vidéo ou au moins une photo/);
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
