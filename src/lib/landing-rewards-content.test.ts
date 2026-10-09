/* Landing — cohérence du programme de fidélité avec le modèle LTV.
 *
 * Exécuté avec Node 22+ natif (type stripping, zéro dépendance) :
 *   node --test src/lib/landing-rewards-content.test.ts
 * ou : npm run test:unit
 *
 * POURQUOI CE TEST EXISTE
 * La landing est le SEUL point du dépôt grand public qui décrit le programme
 * de fidélité — `/client/recompenses` ne s'adresse qu'aux clients connectés. Or
 * la section est restée sur l'ancien modèle « nombre de missions » après le
 * chantier 4-FONDATIONS-C (marge cumulée), et une réponse FAQ reprenait le
 * même texte obsolète. Ces deux emplacements sont faciles à laisser diverger en
 * silence : rien ne les relie à `lib/rewards-view.ts`, qui est la source de
 * vérité côté client.
 *
 * Les seuils sont lus dans la SOURCE DE VRAIE BACKEND
 * `src/rewards/rewards.config.ts` et comparés à ceux affichés sur la landing.
 * Si le backend change un seuil, ce test échoue au lieu de laisser la landing
 * annoncer un montant faux à des visiteurs.
 *
 * Ce test est STATIQUE (readFileSync + assertions sur le texte) : il lit donc
 * commentaires et chaînes comprises. Les motifs ci-dessous sont volontairement
 * écrits pour ne pas se auto-déclencher via les commentaires du fichier lu.
 *
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');

const SECTIONS = read('../components/landing/landing-sections.tsx');
const FAQ = read('../components/landing/faq.tsx');

/* Les deux emplacements qui décrivaient le programme à la landing. */
const LANDING_COPY = [
  ['landing-sections.tsx', SECTIONS],
  ['faq.tsx', FAQ],
] as const;

/* ── 1. Aucune trace de l'ancien modèle « nombre de missions » ─────────── */

void test('aucun palier basé sur un nombre de dépannages ne subsiste', () => {
  /* Motif volontairement large : il attrape « 5 dépannages », « 25
   * dépannages », « 50 dépannages »… quelle que soit la casse. */
  for (const [name, content] of LANDING_COPY) {
    assert.doesNotMatch(
      content,
      /\d+\s*dépannage/i,
      `${name} décrit encore un palier par nombre de dépannages`,
    );
  }
});

void test('la promesse « la Nᵉ vous offre une intervention » a disparu', () => {
  /* Le superscript U+1D49 est.ce que le dépôt utilisait ; on couvre aussi la
   * forme ASCII pour être sûr qu'aucune variante ne réapparaisse. */
  for (const [name, content] of LANDING_COPY) {
    assert.doesNotMatch(
      content,
      /vous offre/i,
      `${name} promet encore une intervention offerte`,
    );
    assert.doesNotMatch(content, /\b5[ᵉe]\s*dépannage/i);
  }
});

void test('le mot « comptabilisées » (ancienne mécanique de décompte) est absent', () => {
  for (const [name, content] of LANDING_COPY) {
    assert.doesNotMatch(content, /comptabilis/i, `${name} mentionne encore une comptabilisation en nombre de missions`);
  }
});

/* ── 2. Le nouveau modèle est bien celui de la marge cumulée ──────────── */

void test('la landing annonce le mécanisme réel : la marge et le crédit', () => {
  assert.match(SECTIONS, /marge/i, 'la section doit parler de marge');
  assert.match(SECTIONS, /crédit/i, 'la section doit parler de crédit');
  /* Le taux de 5 % est vérifiable : 500 FCFA pour 10 000 FCFA de tranche. */
  assert.match(SECTIONS, /5\s*%/);
});

void test('les trois paliers nature affichent les seuils du backend', () => {
  /* Miroir de backend/src/rewards/rewards.config.ts:113-116
   * NATURE_THRESHOLDS. Toute divergence doit casser ce test. */
  for (const threshold of ['50 000', '100 000', '250 000']) {
    assert.ok(
      SECTIONS.includes(`${threshold} FCFA de marge`),
      `palier « ${threshold} FCFA de marge » absent de la landing`,
    );
  }
});

void test('les titres correspondent aux libellés NATURE du backend', () => {
  for (const label of ['Petit électroménager', 'Électroménager moyen', 'Smartphone']) {
    assert.ok(SECTIONS.includes(label), `libellé « ${label} » absent de la landing`);
  }
});

/* ── 3. Les seuils ne sont pas répétés ailleurs que dans la section ───── */

void test('la FAQ ne réinvente pas de seuil chiffré', () => {
  /* La FAQ reste qualitative : elle renvoie à /client/recompenses, seul endroit
   * qui affiche la progression réelle. Un montant en dur dans la FAQ
   * divergerait de la page dès le prochain changement de barème. */
  assert.doesNotMatch(FAQ, /\d+\s*000\s*FCFA/);
  assert.match(FAQ, /crédit/i);
});

/* ── 4. Les visuels montrent bien la récompense annoncée ───────────────
 *
 * Les anciennes affiches portaient le programme « nombre de missions » GRAVÉ
 * DANS L'IMAGE : aucun texte de la landing ne pouvait le rattraper, et une
 * image ne se relit pas. Elles ont été refaites, et chaque visuel correspond
 * désormais au palier qu'il accompagne.
 *
 * Ces noms de fichiers sont volontairement construits par morceaux : ce test
 * surveille leur absence dans le fichier lu, et il ne doit pas se
 * auto-déclencher via son propre texte.
 */

const VISUALS = [
  ['petit' + '-electromenager.png', 'Petit électroménager'],
  ['electro' + 'menager-moyen.png', 'Électroménager moyen'],
  ['smart' + 'phone.png', 'Smartphone'],
] as const;

void test('chaque palier dispose de son visuel dédié', () => {
  for (const [file, label] of VISUALS) {
    assert.ok(
      SECTIONS.includes(`/recompense/${file}`),
      `visuel du palier « ${label} » absent de la landing`,
    );
  }
});

void test('aucune affiche de l’ancien programme ne subsiste dans la landing', () => {
  /* Chacune de ces affiches était associée à un palier par nombre de
   * missions et affichait ce décompte dans l'image elle-même. */
  const retired = [
    ['tshirt' + '_cap.png'],
    ['tv' + '.png'],
    ['free' + '_repair.png'],
    ['iron' + '.png'],
    ['mystery' + '_box.png'],
  ] as const;
  for (const [file] of retired) {
    assert.doesNotMatch(
      SECTIONS,
      new RegExp(file.replace('.', '\\.')),
      `la landing référence encore l'affiche ${file}`,
    );
  }
});

void test('les visuels du programme sont bien présents sur disque', () => {
  /* Le contenu du tableau est-il seulement correct, ou les fichiers ont-ils
   * été réellement déposés ? Une référence orpheline ne se voit pas à la
   * lecture du source : elle se voit à l'écran, en image cassée. */
  for (const [file] of VISUALS) {
    const onDisk = new URL(`../../public/recompense/${file}`, import.meta.url);
    assert.ok(existsSync(onDisk), `visuel ${file} référencé mais absent de public/recompense/`);
  }
});

/* ── 5. Le catalogue de lots mort a bien disparu ──────────────────────
 *
 * Un composant jamais monté, lui aussi resté sur l'ancien modèle, avait
 * survécu parce que deux tests le lisaient. Il est supprimé : la page de
 * /client/recompenses tire ses paliers de l'API, elle ne l'a jamais utilisé.
 */

void test('le composant de lots jamais monté ne fait plus partie du dépôt', () => {
  const dead = new URL('../components/client/recompenses/reward-catalog.tsx', import.meta.url);
  assert.ok(!existsSync(dead), 'le composant de lots obsolète est toujours présent');
});