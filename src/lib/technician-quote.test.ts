/* Barème de commission technicien — aperçu frontend (chantier 4-FONDATIONS-A).
 *
 * Exécuté avec Node 22+ natif (type stripping, zéro dépendance) :
 *   node --test src/lib/technician-quote.test.ts
 * ou : npm run test:unit
 *
 * Ces tests verrouillent le DOUBLON frontend du barème backend
 * (`backend/src/financial/fee-calculator.ts`). Le doublon n'existe que pour
 * l'aperçu en direct, avant envoi (aucun devis en base = aucun appel API) ;
 * après envoi, les montants affichés viennent du backend. Si le barème change
 * côté backend, ce fichier doit changer dans le MÊME commit — les montants
 * canoniques ci-dessous servant de garde-fou.
 *
 * Les tests de la page (bouton désactivé, formatFCFA) sont vérifiés par
 * lecture statique : ce dépôt n'a ni jsdom ni testing-library.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  MIN_QUOTE_AMOUNT_XAF,
  QUOTE_TRAVEL_FEE_XAF,
  TECHNICIAN_FEE_FIXED_XAF,
  TECHNICIAN_FEE_RATE_PERCENT,
  TECHNICIAN_FEE_LABEL,
  calculateTechnicianFee,
  isQuoteAmountAllowed,
  previewTechnicianQuote,
  quoteAmountError,
} from './technician-quote.ts';

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');

/* ── Constantes du barème ───────────────────────────────────────────── */

void test('barème : 500 FCFA fixes + 4 %, minimum 5 000, transport 2 000', () => {
  assert.equal(TECHNICIAN_FEE_FIXED_XAF, 500);
  assert.equal(TECHNICIAN_FEE_RATE_PERCENT, 4);
  assert.equal(MIN_QUOTE_AMOUNT_XAF, 5_000);
  assert.equal(QUOTE_TRAVEL_FEE_XAF, 2_000);
});

void test('libellé de commission affiché (jamais « 2 % »)', () => {
  assert.match(TECHNICIAN_FEE_LABEL, /500 FCFA \+ 4 %/);
  assert.doesNotMatch(TECHNICIAN_FEE_LABEL, /2 %/);
});

/* ── Commission : exemples canoniques validés ───────────────────────── */

void test('commission = 500 + 4 % du devis (exemples canoniques)', () => {
  const CAS: Array<[number, number]> = [
    [5_000, 700],
    [10_000, 900],
    [15_000, 1_100],
    [25_000, 1_500],
    [100_000, 4_500],
  ];
  for (const [devis, commission] of CAS) {
    assert.equal(calculateTechnicianFee(devis), commission, `devis ${devis}`);
  }
});

void test('la commission ne porte jamais sur le transport', () => {
  // Régression centrale : l'ancien barème était 2 % du BRUT (transport inclus).
  assert.equal(calculateTechnicianFee(25_000), 1_500);
  assert.notEqual(calculateTechnicianFee(25_000), 540);
  // Deux devis identiques → même commission, que le client paie ou non +2000.
  assert.equal(
    calculateTechnicianFee(15_000),
    calculateTechnicianFee(15_000 + QUOTE_TRAVEL_FEE_XAF - QUOTE_TRAVEL_FEE_XAF),
  );
});

void test('commission toujours entière (Int) et sûre', () => {
  for (const devis of [5_000, 7_777, 12_345, 25_000, 33_333, 100_000]) {
    const fee = calculateTechnicianFee(devis);
    assert.ok(Number.isInteger(fee), `devis ${devis}`);
    assert.ok(Number.isSafeInteger(fee));
  }
});

void test('montant invalide → 0 plutôt qu’un NaN affiché', () => {
  assert.equal(calculateTechnicianFee(Number.NaN), 0);
  assert.equal(calculateTechnicianFee(-1), 0);
});

/* ── Récapitulatif complet ──────────────────────────────────────────── */

void test('récapitulatif : devis → ce que paie le client / reçoit le technicien', () => {
  const CAS: Array<{ devis: number; clientPays: number; commission: number; recu: number }> = [
    { devis: 5_000, clientPays: 7_000, commission: 700, recu: 6_300 },
    { devis: 10_000, clientPays: 12_000, commission: 900, recu: 11_100 },
    { devis: 15_000, clientPays: 17_000, commission: 1_100, recu: 15_900 },
    { devis: 25_000, clientPays: 27_000, commission: 1_500, recu: 25_500 },
    { devis: 100_000, clientPays: 102_000, commission: 4_500, recu: 97_500 },
  ];
  for (const { devis, clientPays, commission, recu } of CAS) {
    const preview = previewTechnicianQuote(devis);
    assert.equal(preview.quote, devis);
    assert.equal(preview.clientPays, clientPays, `client paie pour ${devis}`);
    assert.equal(preview.commission, commission, `commission pour ${devis}`);
    assert.equal(preview.net, recu, `technicien reçoit pour ${devis}`);
    assert.equal(preview.travel, 2_000);
    assert.equal(preview.allowed, true);
    // Cohérence : net = brut − commission, et le transport est intégralement
    // reversé (net > devis dès que la commission < 2 000).
    assert.equal(preview.net, preview.clientPays - preview.commission);
  }
});

void test('récapitulatif d\'un devis hors seuil : marqué non autorisé', () => {
  const preview = previewTechnicianQuote(3_000);
  assert.equal(preview.allowed, false);
  assert.equal(preview.commission, 620);
  assert.equal(preview.clientPays, 5_000);
  assert.equal(preview.net, 4_380);
});

/* ── Seuil minimum de devis ─────────────────────────────────────────── */

void test('4 999 refusé, 5 000 accepté (borne inclusive)', () => {
  assert.equal(isQuoteAmountAllowed(3_000), false);
  assert.equal(isQuoteAmountAllowed(4_999), false);
  assert.equal(isQuoteAmountAllowed(5_000), true);
  assert.equal(isQuoteAmountAllowed(25_000), true);
  assert.equal(isQuoteAmountAllowed(5_000.5), false);
});

void test('saisie sous le seuil → message « Minimum 5 000 FCFA »', () => {
  const { amount, error } = quoteAmountError('3000');
  assert.equal(amount, 3_000);
  assert.match(String(error), /Minimum 5 000 FCFA/);
});

void test('saisie valide → aucun message', () => {
  assert.deepEqual(quoteAmountError('5000'), { amount: 5_000, error: null });
  assert.deepEqual(quoteAmountError('25000'), { amount: 25_000, error: null });
  // Espaces de milliers tolérés (saisie mobile).
  assert.deepEqual(quoteAmountError(' 25 000 '), { amount: 25_000, error: null });
});

void test('saisie vide → montant null, AUCUN message (le champ est vide, pas faux)', () => {
  assert.deepEqual(quoteAmountError(''), { amount: null, error: null });
  assert.deepEqual(quoteAmountError('   '), { amount: null, error: null });
});

void test('saisie non numérique ou décimale → message explicite', () => {
  assert.match(String(quoteAmountError('abc').error), /invalide/i);
  assert.match(String(quoteAmountError('2500.75').error), /entier/i);
  assert.match(String(quoteAmountError('-5000').error), /négatif/i);
});

/* ── Intégration UI : vérifications statiques des consuming components ── */

/* Le dépôt n'a ni jsdom ni testing-library : les comportements d'UI sont
 * vérifiés en lisant la source, comme le fait déjà `no-middleware.test.ts`,
 * `demande-equipment.test.ts` ou `technician-auth.test.ts`. Ce qui est verrouillé
 * ici : les deux formulaires de devis passent par la MÊME source de vérité, et
 * aucun montant n'est formaté autrement que par `formatFCFA`. */

void test('formulaire de devis simple : aperçu, seuil et bouton bloqué', () => {
  const page = read('../app/technicien/demandes/[id]/page.tsx');

  // Seuil + aperçu : source unique, pas de formule redondante.
  assert.match(page, /quoteAmountError\(amountValue\)/);
  assert.match(page, /previewTechnicianQuote\(parsedQuote\.amount\)/);
  assert.match(page, /isQuoteAmountAllowed\(parsedQuote\.amount\)/);
  assert.doesNotMatch(page, /amount \* 0\.0?4|500 \+ /);

  // Le bouton « Proposer » est désactivé tant que le devis est hors bornes.
  assert.match(page, /disabled=\{!canSubmitQuote\}/);
  assert.match(page, /const canSubmitQuote =[\s\S]{0,400}quoteDescription\.trim\(\)\.length > 0/);

  // Aperçu affiché AVANT envoi : devis, déplacement, commission, net.
  assert.match(page, /quoteAmount-preview/);
  assert.match(page, /Vous recevrez/);
  assert.match(page, /TECHNICIAN_FEE_LABEL/);

  // Rappel de seuil sous le champ.
  assert.match(page, /hint=\{`Minimum \$\{MIN_QUOTE_AMOUNT_XAF/);

  // Plus aucune trace de l'ancien barème dans cette page.
  assert.doesNotMatch(page, /2 % du brut/);
  assert.doesNotMatch(page, /commission Relio 2 %/);
});

void test('tous les montants de la page devis passent par formatFCFA', () => {
  const page = read('../app/technicien/demandes/[id]/page.tsx');

  // L'ancien `formatAmount` faisait `amount.toLocaleString('fr-FR')` : c'est
  // exactement ce que la règle FCFA interdit. Il doit avoir disparu.
  assert.doesNotMatch(page, /quote\.amount\.toLocaleString/);
  assert.match(page, /function formatAmount[\s\S]{0,200}formatFCFA\(quote\.amount\)/);

  // Aucune conversion locale des montants du devis.
  assert.doesNotMatch(page, /formatFCFA\(latestQuote\.amount\)\.replace/);
});

void test('récapitulatif APRÈS envoi : montants du backend, jamais recalculés', () => {
  const page = read('../app/technicien/demandes/[id]/page.tsx');

  // Les valeurs affichées proviennent des champs renvoyés par l'API…
  assert.match(page, /latestQuote\.commission\s*\?\?/);
  assert.match(page, /latestQuote\.netTechnician\s*\?\?/);
  // …avec un repli `previewTechnicianQuote` pour les devis antérieurs au
  // chantier (mêmes valeurs, donc aucun écart possible).
  assert.match(page, /previewTechnicianQuote\(latestQuote\.repair \?\? latestQuote\.amount\)/);
});

void test('diagnostic libre : même seuil, même source de vérité', () => {
  const hook = read('../components/technician/diagnostic/use-free-diagnostic.ts');
  const desktop = read('../components/technician/diagnostic/free-diagnostic-desktop-view.tsx');
  const mobile = read('../components/technician/diagnostic/free-diagnostic-mobile-view.tsx');

  // La validation ne redefinit plus « entier > 0 » : elle délègue.
  assert.match(hook, /import \{ quoteAmountError \} from '@\/lib\/technician-quote'/);
  assert.match(hook, /const parsedQuote = quoteAmountError\(amount\)/);
  assert.doesNotMatch(hook, /parsedAmount < 1/);

  // Les deux vues affichent le seuil et le libellé de commission.
  for (const view of [desktop, mobile]) {
    assert.match(view, /Minimum 5 000 FCFA par intervention/);
    assert.match(view, /TECHNICIAN_FEE_LABEL/);
  }
});

void test('type du devis exposé par le service : commission et net', () => {
  const service = read('./api/technician-service.ts');
  assert.match(service, /commission\?: number \| null;/);
  assert.match(service, /netTechnician\?: number \| null;/);
});

void test('pages revenus : libellé de commission à jour', () => {
  for (const rel of [
    '../app/technicien/revenus/page.tsx',
    '../components/technician/revenus/revenue-overview.tsx',
    '../app/admin/finances/page.tsx',
    '../components/admin/finances/relio-funds-section.tsx',
  ]) {
    const source = read(rel);
    assert.doesNotMatch(source, /Commission Relio \(2 %\)/, rel);
    assert.doesNotMatch(source, /commissions 2 %/, rel);
  }

  // Le libellé vient de la source unique, pas d'une chaîne recopiée.
  assert.match(
    read('../app/technicien/revenus/page.tsx'),
    /TECHNICIAN_FEE: TECHNICIAN_FEE_LABEL,/,
  );
  // L'admin lit le barème depuis le backend (part fixe exposée par l'API).
  assert.match(read('../app/admin/finances/page.tsx'), /commissionFixedXAF \?\? 0/);
});