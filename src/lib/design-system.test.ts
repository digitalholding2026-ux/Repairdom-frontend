/* CHANTIER DESIGN UI/UX P2/P3 — cohérence du design system.
 *
 * Exécuté avec Node 24 natif (type stripping, zéro dépendance) :
 *   node --test src/lib/design-system.test.ts
 * ou : npm run test:unit
 * Vérifications statiques (jamais bundlé, exclu du tsconfig Next).
 * Identité réelle du projet : orange ambré (#F97316/#FB923C, tokens
 * `relio-orange`), surfaces sombres (#0B0D12), tokens sémantiques
 * (success/warning/error/info/muted). Aucune opération réelle.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../', import.meta.url));

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue;
      walk(full, out);
    } else if (entry.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

const FILES = walk(SRC);
const read = (abs: string): string => readFileSync(abs, 'utf8');
const rel = (abs: string): string => relative(SRC, abs).replace(/\\/g, '/');

/* Couleurs arbitraires autorisées (artwork/logo SVG, halos décoratifs,
 * marqueurs carto, marques opérateurs MTN/Orange, surfaces sombres #0F172A
 * partagées) : toute autre occurrence `bg-[#…]` / `text-[#…]` est un écart.
 * Les tokens `relio-orange` / `relio-bg` couvrent l'identité. */
const HEX_ALLOWLIST = new Set([
  'components/mission/mission-map-inner.tsx',
  'components/ui/logo.tsx',
  'components/client/parrainage/parrainage-overview.tsx',
  'components/ui/gradient-hero-card.tsx',
  /* `reward-progress-card` est sorti de la liste : ses surfaces et son halo
   * passent désormais par les tokens Relio. La liste est un registre de
   * DÉROGATIONS, pas une liste de composants — y faire figurer un fichier
   * conforme finit par l'immuniser contre la règle qui l'a fait entrer. */
]);

void test('tokens : aucune couleur hex arbitraire hors allowlist documentée', () => {
  const offenders: string[] = [];
  for (const file of FILES) {
    const name = rel(file);
    if (HEX_ALLOWLIST.has(name)) continue;
    const lines = read(file).split('\n');
    lines.forEach((line, i) => {
      if (/bg-\[#[0-9a-fA-F]{3,8}\]|text-\[#[0-9a-fA-F]{3,8}\]/.test(line)) {
        offenders.push(`${name}:${i + 1}`);
      }
    });
  }
  assert.deepEqual(offenders, []);
});

void test('tokens : identité via relio-orange / relio-bg (jamais #FF6B00 / #0B0D12 en dur)', () => {
  for (const file of FILES) {
    const content = read(file);
    if (HEX_ALLOWLIST.has(rel(file))) continue;
    assert.doesNotMatch(content, /#FF6B00/);
    assert.doesNotMatch(content, /#0B0D12/);
  }
});

void test('sémantique : statuts et danger via tokens (jamais d’échelles brutes)', () => {
  const dashboard = read(join(SRC, 'components/client/dashboard/client-home-blocks.tsx'));
  assert.doesNotMatch(dashboard, /bg-blue-100/);
  assert.doesNotMatch(dashboard, /bg-green-100/);
  assert.match(dashboard, /bg-info-soft/);
  assert.match(dashboard, /bg-success-soft/);
  const profil = read(join(SRC, 'app/client/profil/page.tsx'));
  assert.doesNotMatch(profil, /bg-red-50/);
  assert.match(profil, /bg-error-soft/);
});

void test('accessibilité : carte GPS nommée, bouton Plus nommé', () => {
  const map = read(join(SRC, 'components/mission/mission-map-inner.tsx'));
  assert.match(map, /role="region"/);
  assert.match(map, /aria-label="Carte de la mission/);
  const nav = read(join(SRC, 'components/ui/bottom-nav.tsx'));
  assert.match(nav, /aria-label="Plus de sections"/);
});

void test('images : <img> uniquement pour URLs dynamiques (jamais de statique)', () => {
  const offenders: string[] = [];
  for (const file of FILES) {
    const lines = read(file).split('\n');
    lines.forEach((line, i) => {
      const m = line.match(/<img[^>]*src=\{?["']([^"'}]+)["']\}?/);
      // src dynamique (variable) = OK ; src littéral statique = migrer vers next/image.
      if (m && !m[1].startsWith('/') && !m[1].includes('{') && !m[0].includes('{')) {
        offenders.push(`${rel(file)}:${i + 1}`);
      }
    });
  }
  assert.deepEqual(offenders, []);
});

void test('branding : aucune référence RepairDom visible (contrat repairDomRevenue excepté)', () => {
  const offenders: string[] = [];
  for (const file of FILES) {
    const lines = read(file).split('\n');
    lines.forEach((line, i) => {
      if (/repairdom/i.test(line) && !/repairdomrevenue/i.test(line)) {
        offenders.push(`${rel(file)}:${i + 1}: ${line.trim().slice(0, 80)}`);
      }
    });
  }
  assert.deepEqual(offenders, []);
});

void test('boutons : hauteurs tactiles (44 px sur md/lg via h-11/h-12)', () => {
  const button = read(join(SRC, 'components/ui/button.tsx'));
  assert.match(button, /md: 'h-11/);
  assert.match(button, /lg: 'h-12/);
  assert.match(button, /disabled:opacity-50/);
  assert.match(button, /aria-busy/);
});

/* ── Logo : le pin DOIT tenir lieu de « o » ────────────────────────────────
 *
 * Régression corrigée : le pin était déjà dessiné dans le wordmark, mais
 * positionné sur une coordonnée fixe très en dehors du texte (~200 px après
 * le « i »), avec une hauteur de 292 px contre 185 px de capitales. Résultat :
 * le mot se lisait « Reli » suivi d'une tache orange déconnectée.
 *
 * Ces assertions verrouillent les DEUX causes : le couplage au texte
 * (`textLength`) et la pose sur la ligne de base (transform).
 */

void test('logo : le pin est couplé au texte (largeur avancée forcée)', () => {
  const logo = read(join(SRC, 'components/ui/logo.tsx'));
  // Sans `textLength`, la position du pin dépend de la police rendue.
  assert.match(logo, /textLength="400"/);
  assert.match(logo, /lengthAdjust="spacingAndGlyphs"/);
});

void test('logo : le pin est posé sur la ligne de base du texte', () => {
  const logo = read(join(SRC, 'components/ui/logo.tsx'));
  /* La ligne de base est celle du `<text>` du wordmark, PAS le premier `y=`
   * du fichier : la variante `icon` déclare un `<circle cy="164">` qui
   * précède le `<text>`, et `/y="(\d+)"/` matchait le `cy` — d'où « 164 »
   * au lieu de « 212 ».
   *
   * On isole donc les LIGNES de l'élément `<text`. `[^>]*` ne suffit pas : le
   * commentaire du composant cite déjà `<text>` en ligne 76, et le motif
   * attrapait cette mention au lieu du JSX. Le `\n` force l'attribut à être
   * sur sa propre ligne, ce qui est le format réel du fichier. */
  const textBlock = /<text\s+[\s\S]*?>/.exec(logo)?.[0];
  assert.ok(textBlock, 'bloc <text> du wordmark présent');
  assert.ok(textBlock.includes('lengthAdjust'), 'le <text> isolé est bien celui du wordmark');
  const baseline = /\by="(\d+)"/.exec(textBlock)?.[1];
  assert.equal(baseline, '212', 'ligne de base attendue');
  // Échelle + translation du pin : 334 (bas du pin local) × 0.565 + 23.3 = 212.
  const transform = /translate\(([\d.]+) ([\d.]+)\) scale\(([\d.]+)\)/.exec(logo);
  assert.ok(transform, 'transform du pin présent');
  const [, , ty, scale] = transform.map(Number) as unknown as number[];
  const pinBottom = 334 * scale + ty;
  assert.ok(
    Math.abs(pinBottom - Number(baseline)) < 1,
    `le pin doit reposer sur la ligne de base (obtenu ${pinBottom.toFixed(2)})`,
  );
  // Échelle UNIFORME : aucune déformation des proportions naturelles du pin.
  const localWidth = 984 - 724;
  const localHeight = 334 - 42;
  const renderedWidth = localWidth * scale;
  const renderedHeight = localHeight * scale;
  assert.ok(
    Math.abs(renderedWidth / renderedHeight - localWidth / localHeight) < 0.01,
    'le pin ne doit pas être étiré',
  );
});

void test('logo : la hauteur du pin reste cohérente avec les capitales', () => {
  const logo = read(join(SRC, 'components/ui/logo.tsx'));
  const scale = Number(/translate\([\d.]+ [\d.]+\) scale\(([\d.]+)\)/.exec(logo)?.[1]);
  const pinHeight = (334 - 42) * scale;
  // Cap-height d'Arial ≈ 0.716 × fontSize ; le pin doit rester dans ce
  // voisinage, ni écrasé (1/2 de la capitale) ni démesuré (×2).
  const capHeight = 0.716 * 220;
  assert.ok(pinHeight > capHeight * 0.9, `pin trop petit (${pinHeight.toFixed(0)})`);
  assert.ok(pinHeight < capHeight * 1.3, `pin trop grand (${pinHeight.toFixed(0)})`);
});

void test('logo : le pin touche le texte, il n’y a pas de trou', () => {
  const logo = read(join(SRC, 'components/ui/logo.tsx'));
  const scale = Number(/translate\([\d.]+ [\d.]+\) scale\(([\d.]+)\)/.exec(logo)?.[1]);
  const pinLeft = 724 * scale + Number(/translate\(([\d.]+)/.exec(logo)?.[1]);
  const textEnd = 40 + 400; // x du texte + largeur avancée forcée
  const gap = pinLeft - textEnd;
  // Un intervalle de quelques px comparable à l'entrelettre ; pas ~200 px.
  assert.ok(gap > 0, 'le pin doit suivre le texte');
  assert.ok(gap < 60, `l'espace texte→pin ne doit pas être un trou (${gap.toFixed(1)} px)`);
});

void test('logo : props size / tone exposées, pin jamais recoloré', () => {
  const logo = read(join(SRC, 'components/ui/logo.tsx'));
  assert.match(logo, /size\?: number/);
  assert.match(logo, /tone\?: LogoTone/);
  assert.match(logo, /height: `\$\{size\}px`/);
  // Le pin garde toujours son dégradé orange, quelle que soit la tone.
  const toneBlocks = logo.slice(logo.indexOf('function textClass'));
  assert.doesNotMatch(toneBlocks.slice(0, toneBlocks.indexOf('sizeStyle')), /#/);
});
