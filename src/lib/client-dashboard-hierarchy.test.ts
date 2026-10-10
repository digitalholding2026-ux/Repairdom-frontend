/* Dashboard client — hiérarchie et convergence avec l'espace technicien.
 *
 * Exécuté avec Node 22+ natif (type stripping, zéro dépendance) :
 *   node --test src/lib/client-dashboard-hierarchy.test.ts
 * ou : npm run test:unit
 *
 * POURQUOI CE TEST EXISTE
 * Le dashboard client affichait ses interventions en cours dans une liste
 * triée par date, sans distinction avec les interventions terminées. Une
 * demande déposée aujourd'hui passait donc devant un dépannage commencé la
 * veille : l'inverse de l'urgence.
 *
 * L'espace technicien traitait ce cas depuis le chantier 6B, mais côté client
 * rien ne l'avait repris. Ce test verrouille la symétrie.
 *
 * Il verrouille aussi la CONVERGENCE entre les deux espaces : même grammaire
 * de mouvement, même noir de marque. Deux vocabularises visuelsdans un même
 * produit finissent toujours par diverger à nouveau.
 *
 * Ce test est STATIQUE : il vérifie que les acquis restent, pas le rendu.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');

const hook = read('../components/client/dashboard/use-client-dashboard-data.ts');
const desktop = read('../components/client/dashboard/client-home-desktop-view.tsx');
const mobile = read('../components/client/dashboard/client-home-mobile-view.tsx');
const liveCard = read('../components/client/dashboard/live-mission-card.tsx');

/* ── 1. La notion d'intervention en cours existe côté client ──────── */

void test('la couche données distingue une intervention en cours', () => {
  assert.match(hook, /activeMission/);
  assert.match(hook, /isActiveMission/);
  /* Même famille de statuts que l'espace technicien : les deux espaces doivent
   * parler de la même chose, sinon un client et un technicien ne décrivent pas
   * la même mission. */
  for (const statut of ['ACCEPTED', 'SCHEDULED', 'IN_PROGRESS']) {
    assert.ok(hook.includes(statut), `statut actif manquant : ${statut}`);
  }
});

void test('l’intervention en cours est DÉRIVÉE, pas redemandée', () => {
  /* Un appel de plus aurait été un aller-retour réseau pour une information
   * déjà présente — et deux sources de vérité sur le même écran. */
  const bloc = hook.slice(hook.indexOf('const activeMission'));
  assert.doesNotMatch(bloc.slice(0, 400), /await |fetch\(|listMyDemandes/, 'la dérivation déclenche un appel réseau');
  assert.match(bloc, /recent\.filter\(isActiveMission\)/);
});

void test('deux interventions en vol se départagent par progression, pas par date', () => {
  /* Deux missions actives ne sont départagées par la date de dépôt que si l'une
   * est arrivée plus tard — ce qui est aléatoire, pas une priorité. */
  const bloc = hook.slice(hook.indexOf('const activeMission'));
  assert.match(bloc, /IN_PROGRESS: 3/);
  assert.match(bloc, /SCHEDULED: 2/);
  assert.match(bloc, /ACCEPTED: 1/);
});

/* ── 2. Elle passe en tête sur les deux vues ───────────────────────── */

void test('l’intervention en cours précède le reste sur les deux vues', () => {
  for (const [nom, vue] of [
    ['bureau', desktop],
    ['mobile', mobile],
  ] as const) {
    const mission = vue.indexOf('Intervention en cours');
    const grillePrincipale =
      nom === 'bureau' ? vue.indexOf('xl:grid-cols-3') : vue.indexOf('Actions rapides');
    assert.ok(mission > -1, `${nom} : aucune intervention en cours`);
    assert.ok(mission < grillePrincipale, `${nom} : l'intervention arrive après le reste`);
  }
});

void test('la carte d’intervention est bien montée, pas seulement importée', () => {
  /* `LiveMissionCard` existait déjà mais n'était importé par AUCUN fichier :
   * un composant factorisé puis oublié. Un import seul ne prouverait rien —
   * il faut l'appel. */
  for (const [nom, vue] of [
    ['bureau', desktop],
    ['mobile', mobile],
  ] as const) {
    assert.match(vue, /<LiveMissionCard mission=\{data\.activeMission\}/, `${nom} : carte non montée`);
  }
});

void test('la carte consomme la forme dérivée, pas la forme brute de l’API', () => {
  /* Construire un `DemandeListItem` pour appeler une fonction n'en fait pas
   * plus : ce serait un objet fabriqué pour satisfaire une signature. */
  assert.match(liveCard, /RecentItem/);
  assert.doesNotMatch(liveCard, /DemandeListItem/);
});

/* ── 3. Convergence avec l’espace technicien ───────────────────────── */

/* Les deux vues doivent composer dans le même ordre de lecture : mission
 * d'abord, puis le reste. Un écart ici se voit comme un changement de
 * sensation d'une page à l'autre. */
void test('la cascade démarre sur l’intervention, sur les deux vues', () => {
  for (const [nom, vue] of [
    ['bureau', desktop],
    ['mobile', mobile],
  ] as const) {
    const delais = [...vue.matchAll(/AnimateOnScroll delay=\{(\d+)\}/g)].map((m) => Number(m[1]));
    assert.ok(delais.length >= 3, `${nom} : seulement ${delais.length} bloc(s) en cascade`);
    assert.equal(delais[0], 0, `${nom} : la cascade ne démarre pas sur l'intervention`);
    for (let i = 1; i < delais.length; i += 1) {
      assert.ok(delais[i]! > delais[i - 1]!, `${nom} : délais non croissants (${delais.join(', ')})`);
    }
  }
});

void test('le noir mobile est celui de la marque', () => {
  /* `slate-950` (#020617) et `relio-bg` (#0b0d12) sont indiscernables à l'œil
   * (1,04:1) — mais l'un vient de l'échelle de marque et l'autre non. Deux
   * valeurs pour le même noir, c'est la promesse d'une divergence future. */
  assert.match(mobile, /bg-relio-bg/);
  assert.doesNotMatch(
    mobile,
    /bg-slate-950/,
    'le noir est revenu en dur : il diverge de l’espace technicien',
  );
});

/* ── 4. Ce qui ne doit pas bouger ───────────────────────────────────── */

/* `responsive.test.ts` verrouille la séparation des deux vues. La refonte ne
 * doit pas les avoir fusionnées, sinon la divergence mobile/desktop — voulue
 * pour éviter les régressions croisées — disparaît. */
void test('les deux vues restent séparées et la grille bureau est intacte', () => {
  assert.match(desktop, /xl:grid-cols-3/);
  assert.doesNotMatch(mobile, /xl:grid-cols-3/);
  /* Les données ne sont demandées que par le hook, jamais par une vue. */
  for (const vue of [desktop, mobile]) {
    assert.doesNotMatch(vue, /listMyDemandes|getClientFinanceSummary|getMe\(/);
  }
});

void test('la hiérarchie n’a déplacé aucune destination', () => {
  /* Le chantier réorganise l'affichage, pas la navigation : les quatre liens
   * doivent rester présents dans les DEUX vues. */
  for (const href of ['/client/demande', '/client/demandes', '/client/solde', '/client/notifications']) {
    for (const [nom, vue] of [
      ['bureau', desktop],
      ['mobile', mobile],
    ] as const) {
      assert.ok(vue.includes(href), `${nom} : ${href} a disparu`);
    }
  }
});