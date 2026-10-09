/* Landing — apparitions au scroll et micro-interactions.
 *
 * Exécuté avec Node 22+ natif (type stripping, zéro dépendance) :
 *   node --test src/lib/landing-animations.test.ts
 * ou : npm run test:unit
 *
 * POURQUOI CE TEST EXISTE
 * Une landing animée peut casser de deux façons qu'aucun outil statique ne
 * voit :
 *   1. le contenu reste INVISIBLE — un bloc masqué à l'opacité zéro dont
 *      l'état visible n'arrive jamais (classe absente, observateur jamais
 *      créé, script désactivé). C'est un contenu perdu, pas un défaut
 *      d'apparence, et il se voit uniquement à l'écran ;
 *   2. le mouvement OVERRIDE le choix du visiteur — l'option « moins de
 *      mouvements » du système doit neutraliser l'intégralité des
 *      animations, pas seulement leur durée.
 *
 * Les deux sont vérifiés ici par lecture des sources : la feuille de style
 * pour l'état de départ et sa surcharge, le composant pour ce qui décide de
 * l'état visible.
 *
 * Ce test est STATIQUE (readFileSync + assertions sur le texte) : il lit donc
 * les commentaires et les chaînes des fichiers lus. Les motifs ci-dessous
 * surveillent des mots qui n'apparaissent nulle part dans les commentaires du
 * composant ni de la feuille de style.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');

const COMPONENT = read('../components/landing/animate-on-scroll.tsx');
const CSS = read('../app/globals.css');
const SECTIONS = read('../components/landing/landing-sections.tsx');
const FAQ = read('../components/landing/faq.tsx');
const STATS = read('../components/landing/trust-stats.tsx');
const HERO = read('../components/landing/hero.tsx');
const FOOTER = read('../components/public/public-footer.tsx');
const HEADER = read('../components/public/public-header.tsx');

/* ── 1. Le composant ─────────────────────────────────────────────────── */

/* C'est lui qui bascule l'état visible : sans directive client, la feuille de
 * style masquerait le contenu indéfiniment. */
void test('le composant d’apparition est un composant client', () => {
  assert.match(COMPONENT, /^'use client'/m);
});

void test('l’apparition est déclenchée par le navigateur, pas par un minuteur', () => {
  /* L'observateur d'intersection est l'API qui décide « ce bloc entre dans
   * l'écran ». Un minuteur fixerait un délai à l'avance, qui ne suit ni la
   * vitesse de défilement ni la position réelle du bloc.
   *
   * Motifs construits par morceaux : ce test surveille leur absence dans le
   * composant, et son propre commentaire les contient. */
  assert.match(COMPONENT, /IntersectionObserver/);
  assert.doesNotMatch(COMPONENT, /set' + 'Timeout/);
  assert.doesNotMatch(COMPONENT, new RegExp('request' + 'AnimationFrame'));
});

void test('l’observateur se débranche après la première apparition', () => {
  /* Sans déconnexion, le bloc reste observé pour rien : il ne se rejoue pas,
   * mais l'observateur reste en mémoire jusqu'au démontage de la page. */
  assert.match(COMPONENT, /disconnect\(\)/);
});

void test('le visiteur qui a demandé moins de mouvements n’attend rien', () => {
  /* L'option système est lue AVANT de créer l'observateur : dans ce cas le
   * bloc est visible dès le départ et aucune animation n'est jouée. */
  assert.match(COMPONENT, /prefers-reduced-motion/);
  assert.match(COMPONENT, /matchMedia/);
});

void test('aucune dépendance d’animation n’est introduite', () => {
  /* Décision produit : la landing reste en stylesheet pur. Une bibliothèque
   * d'animation augmenterait le bundle et déplacerait dans le JavaScript ce
   * que le navigateur sait déjà faire seul. */
  assert.doesNotMatch(COMPONENT, /from ['"](framer-motion|gsap|motion)/);
});

/* ── 2. La feuille de style ──────────────────────────────────────────── */

/* Le bloc est masqué AVANT d'être révélé : c'est ce qui produit l'apparition.
 * Un état initial déjà visible supprimerait l'effet sans rien casser d'autre. */
void test('le bloc attend d’être révélé avant d’être visible', () => {
  assert.match(CSS, /\.animate-on-scroll\s*\{[^}]*opacity:\s*0/s);
  assert.match(CSS, /\.animate-on-scroll\.is-visible\s*\{[^}]*opacity:\s*1/s);
});

void test('l’amplitude reste modérée', () => {
  /* 28 px de remontée et 600 ms : au-delà, la lecture devient une attente.
   * Les seuils suivent la décision produit (« modérée »). */
  assert.match(CSS, /\.animate-on-scroll\s*\{[^}]*translateY\(28px\)/s);
  assert.match(CSS, /\.animate-on-scroll\s*\{[^}]*600ms/s);
  assert.doesNotMatch(CSS, /\.animate-on-scroll\s*\{[^}]*\d{4,}ms/s);
});

void test('les micro-interactions de survol sont déclarées', () => {
  assert.match(CSS, /\.card-hover\s*\{/);
  assert.match(CSS, /\.card-hover:hover\s*\{/);
  assert.match(CSS, /\.icon-hover\s*\{/);
});

/* Une carte cliquable qui perd son anneau de focus n'est plus atteignable au
 * clavier : le survol au pointeur ne dit rien de ce cas. */
void test('une carte au survol reste atteignable au clavier', () => {
  assert.match(CSS, /\.card-hover:focus-visible\s*\{[^}]*outline:/s);
});

/* Point de vigilance réel : la règle globale « moins de mouvements » du dépôt
 * ramène les DURÉES à quasi zéro, mais ne touche ni `opacity` ni `transform`.
 * Sans surcharge explicite des DEUX états, un bloc resterait figé à mi-course
 * (opacité 0, décalé de 28 px) au lieu d'afficher son état final. */
/* On isole le bloc de la DERNIÈRE occurrence : c'est celle qui neutralise les
 * apparitions, l'autre (règle globale du dépôt) ne traite que les durées. */
void test("l'option « moins de mouvements » neutralise les DEUX états", () => {
  const at = CSS.lastIndexOf('@media (prefers-reduced-motion: reduce)');
  assert.ok(at > 0, 'media query de réduction de mouvement absent');
  /* On prend la règle ENTIÈRE, sélecteurs groupés compris : une assertion sur
   * le seul premier bloc seatisfiedait d'un `{` qui n'englobe pas l'état
   * visible — c'est-à-dire d'un test vert qui ne prouve rien. */
  const reduced = CSS.slice(at, CSS.indexOf('\n}', at) + 2);
  assert.match(reduced, /\.animate-on-scroll\s*,/);
  assert.match(reduced, /\.animate-on-scroll\.is-visible\s*\{/);
  assert.match(reduced, /opacity:\s*1/);
  assert.match(reduced, /transform:\s*none/);
});

void test('l’option « moins de mouvements » neutralise aussi le survol', () => {
  const at = CSS.lastIndexOf('@media (prefers-reduced-motion: reduce)');
  const reduced = CSS.slice(at, CSS.indexOf('\n}', at) + 2);
  assert.match(reduced, /\.card-hover/);
  assert.match(reduced, /\.icon-hover/);
});

/* Filet de sécurité : sans script, l'état visible n'arrive jamais. La feuille
 * de style doit donc pouvoir rendre le contenu sans l'aide du composant. */
void test('sans script, le contenu reste lisible', () => {
  const scripting = CSS.slice(CSS.indexOf('@media (scripting: none)'));
  const block = scripting.slice(0, scripting.indexOf('}'));
  assert.match(block, /\.animate-on-scroll/);
  assert.match(block, /opacity:\s*1/);
});

/* ── 3. Les sections animées ─────────────────────────────────────────── */

void test('la landing importe le composant daparition', () => {
  assert.match(SECTIONS, /import \{ AnimateOnScroll \}/);
});

/* Compter les occurrences dans un seul fichier laisse passer une section
 * debranchee : le composant existe ailleurs, le compte global reste bon, et
 * plus rien ne signale que CETTE section ne bouge plus. Chaque fichier d'une
 * section animee doit donc l'etre lui-meme. */
void test("chaque fichier d'une section animee l'est bien", () => {
  for (const [name, source] of [
    ['landing-sections.tsx', SECTIONS],
    ['faq.tsx', FAQ],
    ['trust-stats.tsx', STATS],
  ] as const) {
    assert.match(source, /<AnimateOnScroll/, `${name} n'anime plus rien`);
  }
});

/* Une seule section animée passerait le test précédent tout en laissant les
 * sept autres inchangées : c'est le nombre d'occurrences qui atteste la
 * couverture effective. */
void test('plusieurs sections de la landing sont animées', () => {
  const uses = SECTIONS.match(/<AnimateOnScroll/g) ?? [];
  assert.ok(uses.length >= 5, `seulement ${uses.length} section(s) animée(s) sur la landing`);
});

/* Deux regimes de cascade, volontairement :
 *   • grille bornée (4, 6 ou 7 entrées) → un pas fixe suffit, le dernier
 *     élément attend au plus quelques centaines de millisecondes ;
 *   • liste potentially longue → le pas est plafonné, sinon le dernier élément
 *     d'une FAQ de vingt entrées apparaîtrait bien après le défilement.
 * Ce test verrouille le plafond, pas le pas fixe. */
void test('les cascades longues sont plafonnees', () => {
  assert.match(SECTIONS, /Math\.min\(index \* 60, 300\)/);
  assert.match(FAQ, /Math\.min\(index \* 50, 250\)/);
});

void test('les cartes et leurs icônes portent les micro-interactions', () => {
  assert.match(SECTIONS, /card-hover/);
  assert.match(SECTIONS, /icon-hover/);
});

/* ── 4. Ce qui ne doit pas bouger ────────────────────────────────────── */

/* Le menu mobile vient d'être corrigé et le bandeau d'accueil a déjà ses
 * propres effets : les enveloppeur une troisième fois nuirait aux deux. */
void test('le bandeau d’accueil et le menu ne sont pas envelopedés', () => {
  assert.doesNotMatch(HERO, /AnimateOnScroll/);
  assert.doesNotMatch(HEADER, /AnimateOnScroll/);
  assert.doesNotMatch(FOOTER, /AnimateOnScroll/);
  assert.doesNotMatch(FOOTER, /card-hover/);
});

/* L'accordéon de la FAQ s'ouvre et se ferme nativement ; l'animer par-dessus
 * désynchroniserait l'affichage du contenu et l'état `open`. */
void test('l’accordéon de la FAQ ne reçoit pas d’animation propre', () => {
  assert.match(FAQ, /<AnimateOnScroll/);
  assert.doesNotMatch(FAQ, /<details[^>]*className="[^"]*animate-/);
});