/* Socle de thème sombre — conformité WCAG, VÉRIFIÉE PAR EXÉCUTION.
 *
 * Exécuté avec Node 22+ natif (type stripping, zéro dépendance) :
 *   node --test src/lib/relio-theme.test.ts
 * ou : npm run test:unit
 *
 * POURQUOI CE TEST EST DIFFÉRENT DES AUTRES
 * Le dépôt teste presque tout par lecture statique : `readFileSync` puis
 * `assert.match` sur le texte. C'est adapté aux CONTRATS — une ancre, un
 * libellé, un ordre de blocs.
 *
 * Une palette, non. « Ce couple de couleurs respecte-t-il le rapport de
 * contraste minimal ? » est une question arithmétique. Une assertion
 * textuelle y répondrait « oui » tant que les deux valeurs existent dans le
 * fichier, y compris après qu'on les a rapprochées à 2,3:1. Il faut
 * CALCULER : luminance relative, puis rapport.
 *
 * Les valeurs sont extraites de `globals.css` au moment de l'exécution. Un
 * token modifié sans être revalidé fait donc échouer ce test — c'est tout
 * l'intérêt : le contrôle suit la palette au lieu de la freezes.
 *
 * Référence : WCAG 1.4.3 — 4,5:1 pour le texte courant, 3:1 pour le grand
 * texte et les composants d'interface (1.4.11).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');

const CSS = read('../app/globals.css');

/* ── Arithmétique WCAG ───────────────────────────────────────────────── */

/** Luminance relative sRGB (WCAG 2.1). */
function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const channels = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const linear = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

/** Rapport de contraste entre deux couleurs hexadécimales. */
function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

/* ── Lecture de la palette ──────────────────────────────────────────── */

/** Valeur hexadécimale déclarée pour un token du thème sombre Relio. */
function token(name: string): string {
  const found = new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{3,8})`, 'i').exec(CSS);
  assert.ok(found, `token --color-${name} introuvable ou non hexadécimal dans globals.css`);
  return found[1]!;
}

const BG = token('relio-bg');
const CARD = token('relio-card');
const TEXT = token('relio-text');
const MUTED = token('relio-muted');
const ORANGE = token('relio-orange-bright');

/* ── 1. Les quatre surfaces ─────────────────────────────────────────── */

void test('la palette sombre déclare ses surfaces et ses encres', () => {
  /* Trois rôles ajoutés lors de ce chantier. Ils portent le vocabulaire —
   * `slate-900/70` ici et `#0F172A` là étaient la même valeur écrite de deux
   * façons sur le même écran. */
  for (const role of ['relio-surface', 'relio-border', 'relio-elevated']) {
    assert.match(
      CSS,
      new RegExp(`--color-${role}:`),
      `le rôle --color-${role} manque : les surfaces s'écrivent encore en dur`,
    );
  }
});

/* ── 2. Conformité AA — le texte ───────────────────────────────────── */

void test('les encres du thème sombre atteignent le rapport AA', () => {
  /* 4,5:1 pour du texte courant. Ces deux encres servent aux libellés, aux
   * horodatages, aux descriptions : c'est la lecture la plus fréquente du
   * dashboard, donc celle qui ne peut pas être limite. */
  for (const [nom, couleur] of [
    ['relio-text', TEXT],
    ['relio-muted', MUTED],
    ['orange-bright', ORANGE],
  ] as const) {
    for (const [fond, valeurFond] of [
      ['relio-bg', BG],
      ['relio-card', CARD],
    ] as const) {
      const ratio = contrastRatio(couleur, valeurFond);
      assert.ok(
        ratio >= 4.5,
        `${nom} sur ${fond} : ${ratio.toFixed(2)}:1 — sous le seuil AA de 4,5:1`,
      );
    }
  }
});

void test('l’accent Relio reste lisible sur les deux surfaces', () => {
  /* L'orange est le signe de l'identité. Sur du noir il vire au brun et perd
   * son rôle d'accent : c'est ce qui a fait passer `orange-500` sur fond nuit
   * sans jamais être constaté. */
  const ratio = contrastRatio(ORANGE, BG);
  assert.ok(ratio >= 4.5, `accent sur le fond de page : ${ratio.toFixed(2)}:1`);
});

/* ── 3. Conformité AA — les composants ─────────────────────────────── */

void test('la carte se détache du fond — et c’est la bordure qui y contribue', () => {
  /* MESURE À CONNAÎTRE : `relio-card` sur `relio-bg` ne fait que 1,11:1.
   * Les deux surfaces sont presque identiques ; ce qui rend la carte
   * lisible, c'est sa bordure translucide — et rien d'autre.
   *
   * Une carte est un CONTENEUR décoratif, pas un composant d'interface : le
   * seuil 3:1 du WCAG 1.4.11 ne lui s'applique pas. Mais si la bordure
   * n'apportait pas plus de séparation que le fond, le token `--color-relio-
   * border` ne servirait à rien et la carte disparaîtrait.
   *
   * D'où l'invariant réellement utile : la bordure doit apporter PLUS de
   * séparation que le remplissage. C'est mesurable, et ça protège contre la
   * suppression accidentelle de la bordure. */
  const separationParRemplissage = contrastRatio(CARD, BG);
  assert.ok(
    relativeLuminance(CARD) > relativeLuminance(BG),
    'la carte doit être plus claire que le fond de page',
  );

  /* Bordure = blanc à 8 % composé sur le fond. */
  const alphaBordure = /--color-relio-border:\s*rgb\(255 255 255 \/ ([\d.]+)\)/.exec(CSS);
  assert.ok(alphaBordure, 'le rôle --color-relio-border n’est plus déclaré en blanc translucide');
  const alpha = Number(alphaBordure[1]);
  /* Composition du blanc translucide sur le fond : `a·255 + (1−a)·canal`.
   * Le premier terme est l'opacité du BLANC (255), pas l'alpha — l'écrire
   * `alpha * 255 + …` revient à multiplier deux fois l'opacité. */
  const fondRgb = [0, 2, 4].map((i) => parseInt(BG.replace('#', '').slice(i, i + 2), 16));
  const bordureEffective = fondRgb
    .map((canal) => Math.round(alpha * 255 + (1 - alpha) * canal).toString(16).padStart(2, '0'))
    .join('');

  const separationParBordure = contrastRatio(`#${bordureEffective}`, BG);
  assert.ok(
    separationParBordure > separationParRemplissage,
    `bordure (${separationParBordure.toFixed(2)}:1) doit apporter plus que le fond ` +
      `(${separationParRemplissage.toFixed(2)}:1) — sans elle, la carte n'existe pas`,
  );
});

void test('la surface relève de la carte, pas de l’encre', () => {
  /* Un garde-fou de sens : une « surface » plus claire que le texte, ou plus
   * sombre que le fond, indique un token mal renseigné. */
  assert.ok(relativeLuminance(CARD) > relativeLuminance(BG), 'la carte doit être plus claire que le fond');
  assert.ok(relativeLuminance(TEXT) > relativeLuminance(CARD), 'le texte doit être plus clair que sa carte');
  assert.ok(relativeLuminance(MUTED) < relativeLuminance(TEXT), 'la seconde encre doit être plus sourde que le texte');
});

/* ── 4. La couleur qui échouait ─────────────────────────────────────── */

void test('l’encre de substitution est bien plus contrastée que celle qu’elle remplace', () => {
  /* Constat à l'origine du chantier : `slate-500` sur la surface des cartes
   * plafonnait à 3,7:1 — sous le seuil, donc hors WCAG AA pour du texte. Le
   * token `relio-muted`, longtemps déclaré et jamais utilisé, le corrigeait
   * sans changer la teinte perçue. */
  const ancien = '#64748b';
  const ancienRatio = contrastRatio(ancien, CARD);
  const nouveauRatio = contrastRatio(MUTED, CARD);
  assert.ok(ancienRatio < 4.5, 'le contrôle perdrait son sens si l’ancienne valeur passait');
  assert.ok(
    nouveauRatio > ancienRatio,
    `relio-muted (${nouveauRatio.toFixed(2)}:1) devrait dépasser slate-500 (${ancienRatio.toFixed(2)}:1)`,
  );
});
/* ── 5. Le mode sombre reste OPT-IN ─────────────────────────────────── */

/* `Badge` est rendu dans 42 fichiers du dépôt, `Card` dans 43. Faire du
 * sombre le DEFAUT repeindrait la plateforme entière — et rien ne le
 * signalerait : les usages clairs resteraient syntaxiquement valides, seule
 * leur apparence changerait. Aucun test de rendu ne peut le voir.
 *
 * Ce test verrouille donc le DÉFAUT lui-même, pas les variantes.
 */

void test('le mode sombre est opt-in : le défaut reste clair', () => {
  for (const [nom, source] of [
    ['badge.tsx', read('../components/ui/badge.tsx')],
    ['card.tsx', read('../components/ui/card.tsx')],
  ] as const) {
    /* Signature : la valeur par défaut du paramètre destructuré. */
    assert.match(
      source,
      /tone = 'light'/,
      `${nom} : le mode sombre est devenu le défaut — 40+ usages clairs seraient repeints`,
    );
    assert.doesNotMatch(
      source,
      /tone = 'dark'/,
      `${nom} : le mode sombre ne doit jamais être le défaut`,
    );
  }
});

void test('les variantes sombres existent réellement', () => {
  /* Garde symétrique : avoir une variante sombre ne doit pas non plus
   *effacer les teintes claires, sans quoi le mode sombre deviendrait la
   * seule façon de rendre un badge. */
  const badge = read('../components/ui/badge.tsx');
  assert.match(badge, /darkVariants/);
  assert.match(badge, /bg-emerald-400\/15/);
  assert.match(badge, /bg-muted text-muted-foreground/);

  const card = read('../components/ui/card.tsx');
  assert.match(card, /bg-relio-card/);
  assert.match(card, /glass-card/);
});
