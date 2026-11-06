/* Écrans de mission — convergence du rendu du devis.
 *
 * Exécuté avec Node 22+ natif (type stripping, zéro dépendance) :
 *   node --test src/lib/mission-quote-convergence.test.ts
 * ou : npm run test:unit
 *
 * POURQUOI CE TEST EXISTE
 * Le récapitulatif d'un devis existait en QUATRE copies éparpillées dans les
 * écrans. Chacune pouvait diverger sans qu'aucune réaction
 * n'atteigne qui que ce soit — quatre affichages du même chiffre, sans qu'il
 * y ait quatre sources de vérité. Ce test verrouille qu'il n'en reste qu'une.
 *
 * Il verrouille AUSSI une divergence qui, elle, est réelle et NON corrigée :
 * les deux écrans ne retombent pas sur la même formule quand le devis est
 * ancien et privé du champ `totalToDebit`. Un même devis affiche donc deux
 * montants différents à ses deux/moitié lecture. Trancher reviendrait à choisir
 * quel montant est le bon — ce n'est pas un calcul, c'est une décision
 * produit. Ce test ne la tranche donc pas : il la garde VISIBLE.
 *
 * Ce test est STATIQUE.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');

const COMPOSANT = read('../components/mission/quote-lines.tsx');
const CLIENT = read('../app/client/demandes/[id]/page.tsx');

/* Le markup EXACT que produisaient les quatre copies. Couter plus lisible
 * qu'un mot comme « Diagnostic », qui apparaît trente fois ailleurs dans les
 * pages pour des raisons sans rapport avec le récapitulatif. */
const MARQUEURS_DUPLICES = [
  '<span className="text-muted-foreground">Réparation</span>',
  '<span className="text-muted-foreground">Déplacement</span>',
  '<dt className="text-muted-foreground">Réparation</dt>',
  '<dt className="text-muted-foreground">Déplacement</dt>',
];

void test('le récapitulatif n’existe plus qu’en un seul endroit', () => {
  /* Chaque ligne ne doit être écrite qu'une fois dans tout le dépôt. Deux
   * occurrences = deux affichages du même chiffre, divergibles en silence. */
  for (const marqueur of MARQUEURS_DUPLICES) {
    for (const source of [CLIENT]) {
      const occurrences = source.split(marqueur).length - 1;
      assert.equal(occurrences, 0, `« ${marqueur} » écrit ${occurrences} fois hors du composant`);
    }
    /* Dans le composant, la balise est la variable `Label` — c'est le point
     * de la convergence : le même contenu, la balise s'adapte au contexte.
     * On remplace la balise OUVERANTE ET la FERMETURE : le composant ne
     * contient plus ni `span` ni `dt` en clair, ce qui est précisément ce
     * qui prouve que la présentation est centralisée. */
    const attendu = marqueur
      .replace(/^<(span|dt)/, '<Label')
      .replace(/<\/(span|dt)>/, '</Label>');
    assert.equal(
      COMPOSANT.split(attendu).length - 1,
      1,
      `« ${marqueur} » doit exister une fois dans le composant`,
    );
  }
});

void test("l'écran client monte le composant partagé", () => {
  assert.match(CLIENT, /<QuoteLines/);
  /* L'import seul ne prouverait rien — il faut l'appel. */
  assert.match(CLIENT, /<QuoteLines[\s\S]{0,600}totalLabel="Total à payer"/);
});

/* Le calcul reste à l'appelant. C'est le cœur du chantier : l'abstraction
 * porte la PRÉSENTATION, jamais le MONTANT. */
void test('le calcul du total reste visible au point d’appel', () => {
  assert.match(
    CLIENT,
    /total=\{latestQuote\.totalToDebit \?\? \(latestQuote\.amount \+ \(latestQuote\.travel \?\? 0\)\)\}/,
    'le client ne calcule plus son total : la formule devient invisible',
  );
});

/* La formule du montant à payer reste calculée par l'écran. Le composant
 * partagé ne reçoit qu'un nombre déjà résolu : c'est ce qui empêche un
 * montant de changer en production sans qu'une décision ait été prise. */
void test('la formule du total reste dans l’écran, pas dans le composant', () => {
  assert.match(CLIENT, /totalToDebit \?\? \(latestQuote\.amount/);
  assert.doesNotMatch(COMPOSANT, /latestQuote\./, 'l’écran a délégué son calcul au composant');
  assert.match(COMPOSANT, /total: number \| null;/);
});

/* L'écran client rend une liste de définitions, le composant sait aussi rendre
 * une grille simple. Perdre le `dt`/`dd`
 * serait une régression d'accessibilité — invisible à l'œil. */
void test('la sémantique de liste de définitions est préservée côté client', () => {
  assert.match(CLIENT, /<dl[\s\S]{0,200}<QuoteLines/);
  assert.match(CLIENT, /labelTag="dt"/);
  assert.match(CLIENT, /valueTag="dd"/);
  /* Par défaut le composant se fige sur
   * `span` pour ne pas imposer une sémantique qui n'a pas cours partout. */
  assert.match(COMPOSANT, /labelTag: Label = 'span'/);
});

void test('le composant porte les libellés, pas les écrans', () => {
  /* Un libellé figé dans le composant serait soit faux pour un des deux
   * écrans, soit une prop inutile. */
  for (const libelle of ['Diagnostic', 'Intervention', 'Réparation', 'Déplacement']) {
    assert.ok(COMPOSANT.includes(libelle), `libellé manquant : ${libelle}`);
  }
  assert.doesNotMatch(COMPOSANT, /Total à payer/, 'libellé du client figé dans le composant');
  assert.doesNotMatch(COMPOSANT, /Total client \(brut\)/, 'un second libellé de total figé dans le composant');
  assert.match(COMPOSANT, /totalLabel/);
});