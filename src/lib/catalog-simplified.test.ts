/* Catalogue simplifié — hiérarchie Admin :
 * Catalogue → Spécification → Modèle → Catégorie → Tarification
 * (Min / Prix courant / Barème). Vérifications statiques (jamais bundlé) :
 *   node --test src/lib/catalog-simplified.test.ts
 * ou : npm run test:unit
 * - ResponsiveView sur chaque niveau (jamais window.innerWidth) ;
 * - terminologie métier simplifiée ;
 * - aucun champ technique (durée, difficulté, pièces, frais) dans
 *   l'interface Admin (conservés en base pour technicien/devis) ;
 * - activation/désactivation disponible à chaque niveau.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel: string): string =>
  readFileSync(new URL(rel, import.meta.url), 'utf8');

const CATALOG = '../app/admin/catalog/page.tsx';
const DOMAIN = '../app/admin/catalog/[domainId]/page.tsx';
const BRAND = '../app/admin/catalog/[domainId]/brands/[brandId]/page.tsx';
const MODEL = '../app/admin/catalog/[domainId]/brands/[brandId]/models/[modelId]/page.tsx';
const PROBLEM = '../app/admin/catalog/[domainId]/[problemId]/page.tsx';
const DIAGNOSTIC = '../app/admin/catalog/[domainId]/[problemId]/[diagnosticId]/page.tsx';

const PAGES = [CATALOG, DOMAIN, BRAND, MODEL, PROBLEM, DIAGNOSTIC];

void test('catalogue simplifié : ResponsiveView sur chaque niveau, jamais innerWidth', () => {
  for (const rel of PAGES) {
    const src = read(rel);
    assert.match(src, /ResponsiveView/, `${rel} : ResponsiveView`);
    assert.match(src, /mobile=/, `${rel} : vue mobile`);
    assert.match(src, /desktop=/, `${rel} : vue desktop`);
  }
  for (const rel of PAGES) {
    assert.doesNotMatch(read(rel), /window\.innerWidth/, `${rel} : pas de innerWidth`);
  }
});

void test('catalogue simplifié : hiérarchie métier visible dans l’interface', () => {
  assert.match(read(CATALOG), /Spécification → Modèle → Catégorie → Tarification/);
  assert.match(read(DOMAIN), /Spécifications/);
  assert.match(read(BRAND), /Spécification/);
  assert.match(read(MODEL), /Catégories de ce modèle/);
  assert.match(read(PROBLEM), /Catégorie/);
  assert.match(read(DIAGNOSTIC), /Tarifs \(/);
  // Le tarif affiche Nom + Min / Prix courant / Barème, sans autre montant.
  const diag = read(DIAGNOSTIC);
  assert.match(diag, /Prix courant/);
  assert.match(diag, /Min \{/);
  assert.match(diag, /Barème \{/);
});

void test('catalogue simplifié : aucun champ technique dans l’interface Admin', () => {
  const forbidden = /estimatedTime|needsParts|partsNote|travelFee|serviceFee|confidence|internalNotes|Difficulté|Durée|Nécessite des pièces|Frais déplacement|Frais Relio/;
  for (const rel of PAGES) {
    assert.doesNotMatch(read(rel), forbidden, `${rel} : sans champ technique`);
  }
});

void test('catalogue simplifié : création / activation à chaque niveau', () => {
  assert.match(read(CATALOG), /createDomain/);
  assert.match(read(DOMAIN), /updateDomain/);
  assert.match(read(BRAND), /updateBrand/);
  assert.match(read(BRAND), /createModel/);
  // Le modèle s’active/désactive depuis sa page ET depuis sa spécification.
  assert.match(read(MODEL), /updateModel/);
  assert.match(read(MODEL), /Actif/);
  assert.match(read(PROBLEM), /updateProblem/);
  assert.match(read(DIAGNOSTIC), /updateDiagnostic/);
  assert.match(read(DIAGNOSTIC), /createPricing|updatePricing/);
});

void test('tarification modèle : prix courant affiché dans son contexte modèle', () => {
  const api = read('../lib/api/admin-service.ts');
  assert.match(api, /getProblemScale/);
  assert.match(api, /problems\/.*\/scale/);
  // Page modèle : tableau Catégorie / Min / Prix courant / Barème du modèle.
  const model = read(MODEL);
  assert.match(model, /getProblemScale/);
  assert.match(model, /Tarifs du modèle/);
  assert.match(model, /<table/);
  assert.match(model, /Prix courant \(FCFA\)/);
  // Page catégorie : résumé des tarifs avec son modèle.
  const problem = read(PROBLEM);
  assert.match(problem, /getProblemScale/);
  assert.match(problem, /Prix courant/);
  // Page tarif : bannière « ce prix courant concerne le modèle », création
  // impossible hors modèle (jamais de tarif global ambigu).
  const diag = read(DIAGNOSTIC);
  assert.match(diag, /Ce prix courant concerne le modèle/);
  assert.match(diag, /aucun nouveau tarif ne peut être créé ici/);
  assert.match(diag, /problem\?\.model \? \(/);
});
