import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canCreateDraft,
  diffDraftPayload,
  draftToWizardFields,
  toDraftPayload,
  type WizardDraftFields,
} from './demande-draft-sync.ts';

/* Chantier D2 — logique PURE du brouillon.
 *
 * Ces fonctions portent toute la stratégie de synchronisation du wizard
 * (projection, seuil de création, diff PATCH, restauration). Les tester
 * directement est possible parce qu'elles sont pures : ni React, ni DOM, ni
 * réseau. Le composant `DemandeWizard` lui-même n'est PAS monté (convention du
 * dépôt, cf. `demande-media.test.ts`). */

function fields(overrides: Partial<WizardDraftFields> = {}): WizardDraftFields {
  return {
    categoryId: 'electricite',
    domainId: 'dom-1',
    brandId: 'brand-1',
    equipmentFamily: '',
    description: 'Ma lampe ne s’allume plus',
    city: 'Douala',
    neighborhood: '',
    address: '',
    landmark: '',
    contactPhone: '',
    latitude: null,
    longitude: null,
    requestedMode: 'ASAP',
    requestedAtIso: null,
    isOtherDomain: false,
    ...overrides,
  };
}

/* ── toDraftPayload ────────────────────────────────────────────────── */

test('toDraftPayload : projette les champs du wizard', () => {
  const payload = toDraftPayload(fields());
  assert.equal(payload.categoryId, 'electricite');
  assert.equal(payload.description, 'Ma lampe ne s’allume plus');
  assert.equal(payload.city, 'Douala');
  assert.equal(payload.domainId, 'dom-1');
  assert.equal(payload.brandId, 'brand-1');
  assert.equal(payload.requestedMode, 'ASAP');
});

test('toDraftPayload : N’envoie jamais `medias` (le backend le refuse en 400)', () => {
  assert.equal(Object.keys(toDraftPayload(fields())).includes('medias'), false);
});

test('toDraftPayload : omet les champs optionnels vides', () => {
  const payload = toDraftPayload(fields());
  for (const key of ['neighborhood', 'address', 'landmark', 'contactPhone', 'equipmentFamily']) {
    assert.equal(key in payload, false, `${key} ne doit pas être présent`);
  }
});

test('toDraftPayload : n’envoie `equipmentFamily` que sur le parcours « Autre »', () => {
  const autre = toDraftPayload(
    fields({ isOtherDomain: true, domainId: '', equipmentFamily: 'GAME_CONSOLE' }),
  );
  assert.equal(autre.equipmentFamily, 'GAME_CONSOLE');
  // Sur le parcours catalogue, la famille ne doit jamais être transmise :
  // `DemandesService` refuse une famille quand un domaine est fourni (400).
  const catalogue = toDraftPayload(fields({ equipmentFamily: 'GAME_CONSOLE' }));
  assert.equal('equipmentFamily' in catalogue, false);
});

test('toDraftPayload : retombe sur la catégorie `autre` si aucune n’est choisie', () => {
  assert.equal(toDraftPayload(fields({ categoryId: '' })).categoryId, 'autre');
});

test('toDraftPayload : ignore un GPS non fini', () => {
  const payload = toDraftPayload(fields({ latitude: NaN, longitude: Infinity }));
  assert.equal('latitude' in payload, false);
  assert.equal('longitude' in payload, false);
});

test('toDraftPayload : transmet un GPS valide', () => {
  const payload = toDraftPayload(fields({ latitude: 3.87, longitude: 11.51 }));
  assert.equal(payload.latitude, 3.87);
  assert.equal(payload.longitude, 11.51);
});

test('toDraftPayload : trim les champs texte', () => {
  const payload = toDraftPayload(fields({ city: '  Douala  ', address: '  Rue 12 ' }));
  assert.equal(payload.city, 'Douala');
  assert.equal(payload.address, 'Rue 12');
});

test('toDraftPayload : transmet requestedAt seulement s’il existe', () => {
  assert.equal('requestedAt' in toDraftPayload(fields()), false);
  const payload = toDraftPayload(
    fields({ requestedMode: 'SCHEDULED', requestedAtIso: '2026-03-05T09:30:00.000Z' }),
  );
  assert.equal(payload.requestedAt, '2026-03-05T09:30:00.000Z');
});

/* ── canCreateDraft ────────────────────────────────────────────────── */

test('canCreateDraft : refuse tout brouillon tant que le minimum DTO n’est pas atteint', () => {
  /* Le backend refuse `description` < 10 caractères et `city` vide : créer
   * avant ce seuil partiraient en 400 à chaque frappe. */
  assert.equal(canCreateDraft(fields({ city: '' })), false);
  /* 9 caractères : sous le seuil de 10. Attention à ne pas écrire une
   * fixture de 10 caractères exacts ('trop court' en fait 10 et passerait). */
  assert.equal(canCreateDraft(fields({ description: 'trop court' })), true); // = 10 car. : accepté
  assert.equal(canCreateDraft(fields({ description: 'trop cou' })), false);  // = 8 car. : refusé
  assert.equal(canCreateDraft(fields({ categoryId: '' })), true, 'categoryId retombe sur autre');
});

test('canCreateDraft : accepte la description de 10 caractères exactement', () => {
  assert.equal(canCreateDraft(fields({ description: '1234567890' })), true);
});

test('canCreateDraft : refuse une description en blancs', () => {
  assert.equal(canCreateDraft(fields({ description: '           ' })), false);
});

/* ── diffDraftPayload ──────────────────────────────────────────────── */

test('diffDraftPayload : sans instantané précédent, renvoie tout le payload', () => {
  const payload = toDraftPayload(fields());
  assert.deepEqual(diffDraftPayload(null, payload), payload);
});

test('diffDraftPayload : ne renvoie QUE les champs modifiés', () => {
  const previous = toDraftPayload(fields());
  const next = toDraftPayload(fields({ address: 'Rue 12' }));
  assert.deepEqual(diffDraftPayload(previous, next), { address: 'Rue 12' });
});

test('diffDraftPayload : renvoie un objet VIDE si rien n’a bougé', () => {
  /* Sans cela, le wizard émettrait un PATCH inutile toutes les 800 ms. */
  const previous = toDraftPayload(fields());
  const next = toDraftPayload(fields());
  assert.deepEqual(diffDraftPayload(previous, next), {});
});

test('diffDraftPayload : un champ effacé est renvoyé vide pour neutraliser le backend', () => {
  /* Sans ce comportement, vider l’adresse ne supprimerait jamais la valeur
   * enregistrée côté brouillon — l’utilisateur verrait sa saisie revenir. */
  const previous = toDraftPayload(fields({ address: 'Rue 12' }));
  const next = toDraftPayload(fields({ address: '' }));
  assert.deepEqual(diffDraftPayload(previous, next), { address: '' });
});

test('diffDraftPayload : détecte le changement de catégorie', () => {
  const previous = toDraftPayload(fields());
  const next = toDraftPayload(fields({ categoryId: 'plomberie' }));
  assert.deepEqual(diffDraftPayload(previous, next), { categoryId: 'plomberie' });
});

test('diffDraftPayload : détecte le passage à un mode planifié', () => {
  const previous = toDraftPayload(fields());
  const next = toDraftPayload(
    fields({ requestedMode: 'SCHEDULED', requestedAtIso: '2026-03-05T09:30:00.000Z' }),
  );
  const diff = diffDraftPayload(previous, next);
  assert.equal(diff.requestedMode, 'SCHEDULED');
  assert.equal(diff.requestedAt, '2026-03-05T09:30:00.000Z');
});

test('diffDraftPayload : détecte le retrait du GPS', () => {
  const previous = toDraftPayload(fields({ latitude: 3.87, longitude: 11.51 }));
  const next = toDraftPayload(fields());
  const diff = diffDraftPayload(previous, next);
  assert.equal(diff.latitude, '');
  assert.equal(diff.longitude, '');
});

/* ── draftToWizardFields ───────────────────────────────────────────── */

test('draftToWizardFields : restaure tous les champs textuels', () => {
  const restored = draftToWizardFields({
    categoryId: 'plomberie',
    domainId: 'dom-2',
    brandId: 'brand-2',
    description: 'Fuite sous l’évier',
    city: 'Yaoundé',
    neighborhood: 'Mbankomo',
    address: 'Rue 12',
    landmark: 'pharmacie',
    contactPhone: '+237600000000',
    requestedMode: 'SCHEDULED',
    requestedAt: '2026-03-05T09:30:00.000Z',
  });
  assert.equal(restored.categoryId, 'plomberie');
  assert.equal(restored.domainId, 'dom-2');
  assert.equal(restored.brandId, 'brand-2');
  assert.equal(restored.description, 'Fuite sous l’évier');
  assert.equal(restored.city, 'Yaoundé');
  assert.equal(restored.neighborhood, 'Mbankomo');
  assert.equal(restored.address, 'Rue 12');
  assert.equal(restored.landmark, 'pharmacie');
  assert.equal(restored.contactPhone, '+237600000000');
  assert.equal(restored.requestedMode, 'SCHEDULED');
  assert.equal(restored.requestedAtIso, '2026-03-05T09:30:00.000Z');
});

test('draftToWizardFields : les null du backend redeviennent des chaînes vides', () => {
  const restored = draftToWizardFields({
    categoryId: 'autre',
    domainId: null,
    brandId: null,
    description: 'Mon volet est cassé',
    city: 'Kribi',
    neighborhood: null,
  });
  assert.equal(restored.domainId, '');
  assert.equal(restored.brandId, '');
  assert.equal(restored.neighborhood, '');
  assert.equal(restored.city, 'Kribi');
});

test('draftToWizardFields : détecte le parcours « Autre »', () => {
  const autre = draftToWizardFields({
    categoryId: 'autre',
    domainId: null,
    equipmentFamily: 'GAME_CONSOLE',
    description: 'Ma console ne démarre plus',
    city: 'Douala',
  });
  assert.equal(autre.isOtherDomain, true);
  assert.equal(autre.equipmentFamily, 'GAME_CONSOLE');

  const catalogue = draftToWizardFields({
    categoryId: 'electricite',
    domainId: 'dom-1',
    equipmentFamily: null,
    description: 'Ma lampe est morte',
    city: 'Douala',
  });
  assert.equal(catalogue.isOtherDomain, false);
});

test('draftToWizardFields : retombe sur ASAP si le mode est inconnu', () => {
  const restored = draftToWizardFields({
    categoryId: 'autre',
    description: 'Panne quelconque',
    city: 'Douala',
    requestedMode: 'N_IMPORTE_QUOI',
  });
  assert.equal(restored.requestedMode, 'ASAP');
});

test('draftToWizardFields : restaure un GPS valide, sinon null', () => {
  const avecGps = draftToWizardFields({
    categoryId: 'autre',
    description: 'Panne quelconque',
    city: 'Douala',
    latitude: 3.87,
    longitude: 11.51,
  });
  assert.equal(avecGps.latitude, 3.87);

  const sansGps = draftToWizardFields({
    categoryId: 'autre',
    description: 'Panne quelconque',
    city: 'Douala',
    latitude: null,
    longitude: null,
  });
  assert.equal(sansGps.latitude, null);
});

/* ── Aller-retour : ce qui est écrit est restaurable ───────────────── */

test('aller-retour : un payload projeté puis restauré redonne les mêmes champs', () => {
  /* Verrouille la cohérence wizard → backend → wizard, qui est la promesse du
   * Test 2 du scénario de production (reprise après F5). */
  const source = fields({
    categoryId: 'plomberie',
    neighborhood: 'Mbankomo',
    address: 'Rue 12',
    landmark: 'pharmacie',
    contactPhone: '+237600000000',
    latitude: 3.87,
    longitude: 11.51,
  });
  const payload = toDraftPayload(source);
  const restored = draftToWizardFields(payload);
  const rebuilt = toDraftPayload({ ...source, ...restored });
  assert.deepEqual(rebuilt, payload);
});