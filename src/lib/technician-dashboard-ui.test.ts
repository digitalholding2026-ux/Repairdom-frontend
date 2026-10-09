/* Dashboard technicien — coque, surfaces et mouvement.
 *
 * Exécuté avec Node 22+ natif (type stripping, zéro dépendance) :
 *   node --test src/lib/technician-dashboard-ui.test.ts
 * ou : npm run test:unit
 *
 * POURQUOI CE TEST EXISTE
 * Le dashboard est en thème SOMBRE forcé, alors que tout le reste du dépôt
 * suit le thème clair du système de design. Cette différence crée trois
 * familles de défauts qui ne se voient qu'à l'écran :
 *
 *   1. le fond sombre n'était posé que sur le rendu FINAL — les états de
 *      chargement et d'erreur s'affichaient clairs, puis l'écran virait au
 *      noir à l'arrivée des données ;
 *   2. les surfaces s'écrivaient en dur, et la même valeur apparaissait sous
 *      deux notations sur le même écran (`slate-900/70` d'un côté, `#0F172A`
 *      de l'autre) ;
 *   3. les composants du thème clair utilisés sur fond nuit — un badge clair
 *      posé sur une carte sombre devient l'élément le plus lumineux de
 *      l'écran, et la hiérarchie visuelle s'inverse.
 *
 * Ce test est STATIQUE : il vérifie que les trois points restent acquis. Il ne
 * prouve pas le rendu — il prouve qu'on n'a pas régressé.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');

const page = read('../app/technicien/page.tsx');
const overview = read('../components/technician/dashboard/tech-overview.tsx');
const shell = read('../components/technician/dashboard/tech-shell.tsx');
const countUp = read('../components/technician/dashboard/count-up.tsx');

/* ── 1. La coque porte le fond, quel que soit l'état ─────────────────
 *
 * Le bug initial : le fond était posé sur le div racine du rendu final. Les
 * deux sorties anticipées ne le portaient pas. Au premier rendu l'écran était
 * clair, puis virait au noir — à chaque ouverture, en extérieur.
 */
void test('les trois états du dashboard passent par la même coque', () => {
  assert.match(page, /import \{ TechShell \}/);
  /* Les trois sorties : chargement, erreur, rendu final. */
  const ouvertures = (page.match(/<TechShell>/g) ?? []).length;
  assert.ok(
    ouvertures >= 3,
    `${ouvertures} ouverture(s) de coque : un état s'affiche sans le fond sombre`,
  );
});

void test('la coque porte le fond sombre et la hauteur dynamique', () => {
  assert.match(shell, /bg-relio-bg/);
  /* `min-h-dvh` et non `min-h-screen` : sur mobile, les barres d'URL
   * rétractables réduisent la hauteur utile. `screen` vaut la hauteur la plus
   * haute, d'où un espace mort au bas de l'écran. */
  assert.match(shell, /min-h-dvh/);
  assert.doesNotMatch(page, /min-h-screen/, 'la hauteur statique est revenue dans la page');
});

void test('le squelette de chargement reçoit la coque', () => {
  /* C'était précisément l'état oublié. */
  const chargement = page.slice(page.indexOf('if (loading)'), page.indexOf('if (error)'));
  assert.match(chargement, /<TechShell>/);
  assert.match(chargement, /<DashboardSkeleton \/>/);
});

/* ── 2. Les surfaces viennent des tokens ───────────────────────────── */

void test('les surfaces du dashboard ne sont plus écrites en dur', () => {
  assert.match(overview, /bg-relio-card/);
  assert.doesNotMatch(
    overview,
    /bg-slate-900\/70/,
    'la surface est revenue en dur : deux notations de la même valeur',
  );
});

void test('la carte de progression utilise le même token que les autres', () => {
  /* Elle est rendue sur le MÊME écran, dans la colonne d'à côté : deux
   * écritures d'une même valeur sur un même écran, c'est une divergence qui
   * n'apparaît qu'en comparant les deux. */
  const reward = read('../components/ui/reward-progress-card.tsx');
  assert.match(reward, /bg-relio-card/);
  assert.doesNotMatch(reward, /#0F172A|#FB923C/, 'couleur en dur revenue dans la carte de progression');
});

/* ── 3. Les composants clairs ne sont pas utilisés sur fond nuit ────── */

void test('les badges du dashboard demandent la variante sombre', () => {
  const badges = [...page.matchAll(/<Badge\b[^>]*>/g), ...overview.matchAll(/<Badge\b[^>]*>/g)];
  assert.ok(badges.length >= 5, `seulement ${badges.length} badge(s) trouvé(s)`);
  for (const [tag] of badges) {
    assert.match(
      tag,
      /tone="dark"/,
      `badge sans variante sombre sur fond nuit : ${tag.slice(0, 60)}`,
    );
  }
});

/* ── 4. Cibles tactiles ──────────────────────────────────────────────
 *
 * Apple impose 44 pt, Android 48 dp. Un `size="sm"` fait 36 px : le
 * technicien travaille d'une main, souvent en mouvement, sur un téléphone
 * qu'il ne regarde pas toujours.
 */
void test('les actions du dashboard atteignent 48 px', () => {
  const petits = [...page.matchAll(/<Button\b[^>]*size="sm"/gs)]
    .concat([...overview.matchAll(/<Button\b[^>]*size="sm"/gs)]);
  assert.equal(
    petits.length,
    0,
    `${petits.length} bouton(s) en taille « sm » (36 px) — sous la cible tactile`,
  );
  assert.match(page, /min-h-12/, 'la cible tactile du bouton de déconnexion n’est pas posée');
  assert.match(overview, /min-h-12/, 'les cibles tactiles des liens du dashboard ne sont pas posées');
});

/* ── 5. Mouvement mesuré, pas décoratif ───────────────────────────── */

void test('les blocs du dashboard apparaissent en cascade', () => {
  assert.match(page, /AnimateOnScroll/);
  const delais = [...page.matchAll(/AnimateOnScroll delay=\{(\d+)\}/g)].map((m) => Number(m[1]));
  assert.ok(delais.length >= 4, `seulement ${delais.length} bloc(s) en cascade`);
  /* Les délais doivent être CROISSANTS : une cascade qui ne l'est plus est
   * une série d'apparitions simultanées, c'est-à-dire pas une cascade. */
  for (let i = 1; i < delais.length; i += 1) {
    assert.ok(delais[i]! > delais[i - 1]!, `délais non croissants : ${delais.join(', ')}`);
  }
});

void test('le compteur animé respecte le refus du mouvement', () => {
  /* Sans cette condition, un utilisateur ayant désactivé les animations
   * verrait quand même son montant défiler. */
  assert.match(countUp, /prefers-reduced-motion: reduce/);
  assert.match(countUp, /cancelAnimationFrame/, 'l’animation ne peut pas être interrompue : elle fuit au démontage');
});

void test('le compteur n’est jamais lu image par image par un lecteur d’écran', () => {
  /* Un compteur animé annoncé à chaque image n'informe pas : il répète
   * trente fois la même information. La valeur finale reste exposée. */
  assert.match(countUp, /aria-hidden/);
  assert.match(countUp, /aria-label=\{format\(value\)\}/);
});

void test('le compteur reste borné dans le temps', () => {
  assert.match(countUp, /DURATION_MS = \d+/);
  assert.match(countUp, /tabular-nums/, 'sans chiffres tabulaires, la largeur saute pendant le décompte');
});

/* ── 6. Ce qui ne doit pas bouger ───────────────────────────────────── */

/* Le chantier a porté le SOLC : ni l'ordre des blocs ni les composants
 *Children ne changent. Les tests d'onboarding verrouillent cet ordre par
 * `indexOf` ; ce test rappelle pourquoi il existe. */
void test('l’ordre de priorité : mission, paperwork, KYC, puis chiffres', () => {
  /* Ordre de LECTURE du technicien, du plus temporel au plus différé :
   *   1. l'intervention acceptée — elle se joue à une heure donnée ;
   *   2. le paperwork qui conditionne le paiement (onboarding, dossier) ;
   *   3. le bandeau KYC ;
   *   4. les chiffres — utiles, jamais urgents.
   *
   * Ce test verrouille cet ordre, pas une position en pixels : ajouter un
   * bloc entre deux de ces étapes ne doit pas le faire échouer. */
  const entete = page.indexOf('</header>');
  const mission = page.indexOf('Intervention en cours');
  const checklist = page.indexOf('<OnboardingChecklist');
  const bandeau = page.indexOf('kycBanner ? (');
  const kpi = page.indexOf('<TechKpiCard');

  assert.ok(entete > -1, 'en-tête introuvable');
  assert.ok(mission > entete, 'la mission doit être le premier bloc de contenu');
  assert.ok(mission < checklist, 'la mission passe avant le paperwork');
  assert.ok(checklist < bandeau, 'la checklist avant le bandeau KYC');
  assert.ok(bandeau < kpi, 'le paperwork avant les chiffres');
});

void test('la mission en cours reste un lien de toute la largeur', () => {
  /* Si elle se réduit à une ligne de texte, elle redevient ce qu'elle était :
   * une information qu'on peut manquer. */
  const bloc = page.slice(page.indexOf('Intervention en cours'), page.indexOf('Intervention en cours') + 900);
  assert.match(bloc, /<Link/);
  assert.match(bloc, /min-h-13/, 'cible tactile absente du bandeau de mission');
});

void test('la coque du dashboard existe et n’est pas réintroduite en dur', () => {
  assert.ok(
    existsSync(new URL('../components/technician/dashboard/tech-shell.tsx', import.meta.url)),
    'la coque a disparu du dépôt',
  );
  assert.doesNotMatch(page, /rounded-3xl bg-relio-bg/, 'la coque a été recopiée en dur dans la page');
});