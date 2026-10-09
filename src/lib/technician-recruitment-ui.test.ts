/* Page de recrutement — traitement visuel et rythme.
 *
 * Exécuté avec Node 22+ natif (type stripping, zéro dépendance) :
 * node --test src/lib/technician-recruitment-ui.test.ts
 * ou : npm run test:unit
 *
 * POURQUOI CE TEST EXISTE
 * La refonte ne touche aucun contenu : uniquement des classes. Or une classe
 * se dégrade silencieusement — une section perd son fond, un chiffre perd sa
 * taille, l'illustration pointe dans le vide — et rien ne bronche : le `tsc`
 * passe, le lint passe, les tests passent, et le défaut n'apparaît qu'à
 * l'écran, une fois déployé.
 *
 * Ces tests verrouillent les quatre décisions visuelles qui portent la
 * hiérarchie de la page :
 * 1. le bandeau s'ouvre sur du profond, pas sur un aplat orange ;
 * 2. les fonds alternent, sinon la page redevient une suite de blocs
 * identiques ;
 * 3. l'illustration du parcours est branchée ET le fichier existe ;
 * 4. les chiffres tiennent la taille qui fait la section.
 *
 * Ce test est STATIQUE (readFileSync + assertions sur le texte) : il lit les
 * commentaires des fichiers lus. Les motifs surveillés ci-dessous n'apparaissent
 * dans aucun de ces commentaires.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');

const PAGE = read('../app/devenir-technicien/page.tsx');
const STATS = read('../app/devenir-technicien/recrutement-stats.tsx');
const CSS = read('../app/globals.css');

/* ── 1. Le bandeau s'ouvre sur du profond ──────────────────────────────
 *
 * Le fond orange vif occupait tout le premier écran et concurrençait le
 * contenu : la page devait une entrée en matière, pas une affiche.
 */
void test('le bandeau est pose sur un fond profond, pas sur un aplat orange', () => {
 const hero = PAGE.slice(PAGE.indexOf('1. HERO'), PAGE.indexOf('2. PREUVES'));
 assert.match(hero, /bg-relio-bg/, 'le bandeau ne porte pas le fond profond');
 assert.doesNotMatch(hero, /brand-gradient/, 'le bandeau garde son ancien aplat orange');
});

/* Les accents servent d'orientation : deux halos discrets, jamais un aplat. */
void test('le bandeau est cassé par des halos, pas par un aplat', () => {
 const hero = PAGE.slice(PAGE.indexOf('1. HERO'), PAGE.indexOf('2. PREUVES'));
 const halos = (hero.match(/recruit-halo/g) ?? []).length;
 assert.ok(halos >= 2, `le bandeau ne porte que ${halos} halo(s)`);
 assert.match(CSS, /\.recruit-halo\s*\{[^}]*border-radius: 9999px/s);
 /* Un halo doit rester décoratif : sinon il intercepte les clics sur les CTA
 * posés dans le même bloc. */
 assert.match(CSS, /\.recruit-halo\s*\{[^}]*pointer-events: none/s);
});

/* ── 2. Le rythme : les fonds alternent ───────────────────────────────── */

/* Sans alternance, dix sections se ressemblent et la page se lit comme un
 * formulaire. Le comptage impose une vraie alternance, pas deux fonds
 * posés au hasard. */
void test('les sections alternent leurs fonds', () => {
 /* Le taux est volontairement supérieur à un tiers : sur un telephone en
 * plein soleil, un gris tres clair a 30 % se noie dans le blanc et le rythme
 * devient invisible. La valeur est donc fixee, pas seulement presence. */
const alternes = (PAGE.match(/bg-muted\/60/g) ?? []).length;
 assert.ok(
 alternes >= 3,
 `seulement ${alternes} section(s) sur fond alterne : le rythme est rompu`,
 );
});

void test('la page alterne aussi par le fond profond', () => {
 /* Deux fonds profonds referment la page : ouverture et fermeture. */
 const profonds = (PAGE.match(/bg-relio-bg/g) ?? []).length;
 assert.ok(profonds >= 2, 'la page ne se referme pas sur un bandeau sombre');
});

/* Les sections ont toutes la meme respiration : c'est elle qui cree le
 * rythme, autant que le fond. */
void test('les sections partagent une meme respiration verticale', () => {
  /* La classe d'une section peut tenir sur une ligne ou etre posee sur la
   * ligne suivante : la fenetre de recherche doit couvrir les deux ecritures,
   * sinon les sections longues — les plus nombreuses — echappent au comptage.
   *
   * Seuil a sept : les deux bandeaux de debut et de fin sont des blocs pleins
   * dimensionnes par leur contenu, ils n'ont pas de respiration verticale. Les
   * sept sections de contenu, elles, doivent toutes en avoir une. */
  const sections = [...PAGE.matchAll(/<section\b[\s\S]{0,320}?>/g)];
  const avecPadding = sections.filter((m) => /\bpy-(8|10|12|16)\b/.test(m[0]));
  assert.equal(sections.length, 9, 'la page doit garder ses neuf sections');
  assert.equal(
    avecPadding.length,
    7,
    `seules ${avecPadding.length} section(s) de contenu ont le padding vertical`,
  );
});

/* ── 3. L'illustration du parcours ───────────────────────────────────── */

/* Une reference de fichier cassee ne se voit qu'a l'ecran : le `tsc` valide
 * le chemin, pas la presence du fichier. D'ou le test sur disque. */
void test("l'illustration du parcours est branchee et presente", () => {
 assert.match(PAGE, /\/technicien\/parcours-illustration\.png/);

 const asset = new URL('../../public/technicien/parcours-illustration.png', import.meta.url);
 assert.ok(
 existsSync(asset),
 "l'image est referencee dans la page mais absente de public/technicien/",
 );
});

/* Sans dimensions, le navigateur reserve zero hauteur avant chargement et la
 * page saute. Les deux attributs sont donc obligatoires. */
void test("l'illustration reserve sa place avant chargement", () => {
 const bloc = PAGE.slice(PAGE.indexOf('parcours-illustration'));
 assert.match(bloc, /width=\{\d+\}/);
 assert.match(bloc, /height=\{\d+\}/);
 assert.match(bloc, /alt="[^"]+"/);
});

/* ── 4. Les chiffres de la section Recrutement ────────────────────────── */

/* Sur deux nombres, une carte autour ferait davantage qu'elle ne mettrait en
 * valeur : c'est la taille qui porte la section. */
void test('les chiffres tiennent une taille de reperage', () => {
 assert.match(STATS, /text-5xl/);
 assert.match(STATS, /md:text-6xl/);
});

/* Le filet qui separe les deux chiffres ne doit pas doubler le dernier : il
 * n'a de sens qu'entre les deux. */
void test('les deux chiffres sont separes par un filet unique', () => {
 assert.match(STATS, /border-r border-border/);
 const filets = (STATS.match(/border-r\b/g) ?? []).length;
 assert.equal(filets, 1, 'le filet doit separer les deux chiffres, pas en border chaque bloc');
});

/* ── 5. Les cartes s'elevent, et la regle est partagee ─────────────────
 *
 * La classe est definie une fois en CSS plutot que recopiee sur chaque carte :
 * vingt-cinq repetitions d'une chaine d'ombres finiraient par diverger.
 */
void test('les cartes partagent une elevation unique et definie en CSS', () => {
 const usages = (PAGE.match(/card-premium/g) ?? []).length;
 assert.ok(usages >= 5, `seulement ${usages} carte(s) en elevation`);
 assert.match(CSS, /\.card-premium:hover\s*\{[^}]*translateY\(-2px\)/s);
 assert.match(CSS, /\.card-premium\s*\{[^}]*transition/s);
});

/* Le soulèvement est un mouvement : il doit disparaitre si le visiteur a
 * demande moins de mouvements, comme toutes les animations du depot.
 *
 * On cible le media query qui SUIT la declaration de la classe : le depot
 * en compte plusieurs, dont un global en amont qui ne traite que les durees. */
void test("le soulèvement respecte l'option « moins de mouvements »", () => {
  const classe = CSS.indexOf('.card-premium');
  assert.ok(classe > 0, 'la classe card-premium est absente de la feuille de style');
  const at = CSS.indexOf('@media (prefers-reduced-motion: reduce)', classe);
  assert.ok(at > 0, 'aucune regle de reduction apres la classe');
  const reduced = CSS.slice(at, CSS.indexOf('\n}', at) + 2);
  assert.match(reduced, /\.card-premium/);
  assert.match(reduced, /transform:\s*none/);
});

/* ── 6. Ce qui ne doit pas bouger ─────────────────────────────────────── */

/* La page est un Server Component : lui ajouter une directive client
 * transformerait toute la page en client et alourdirait le bundle pour rien. */
void test('la page reste un composant serveur', () => {
 assert.doesNotMatch(PAGE, /^'use client'/m);
});