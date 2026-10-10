/* Dette de code — composants morts du dossier dashboard client.
 *
 * Exécuté avec Node 22+ natif (type stripping, zéro dépendance) :
 *   node --test src/lib/dead-code-guard.test.ts
 * ou : npm run test:unit
 *
 * POURQUOI CE TEST EXISTE
 * Un composant mort ne casse rien. Il ne fait pas échouer `tsc`, il ne fait
 * pas échouer le lint, il ne fait échouer aucun test. Il reste là, il grossit,
 * et il donne l'illusion d'une fonctionnalité existante — c'est exactement ce
 * qui s'est produit avec le flux d'activité et la carte de récompenses :
 * 84 et 26 lignes non montées depuis un temps indéterminé.
 *
 * Ce test n'interdit pas le code mort en général : il se limite à ce qui a
 * DÉJÀ été constaté et retiré. Un garde-fou plus large — « aucun export sans
 * usage » — serait plus utile mais exigerait de résoudre les imports
 * dynamiques, les barrels et les points d'entrée, donc à becoming flou.
 *
 * Ce test est STATIQUE : il lit la liste des fichiers et compte les usages.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, existsSync, readFileSync } from 'node:fs';

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');

/* Retraits au chantier 5. Ajouter une entrée ici = ajouter un composant mort
 * au fichier de test, pas à la base de code. */
const RETIRÉS = [
  {
    chemin: '../components/client/dashboard/activity-feed.tsx',
    composant: 'ActivityFeed',
    raison:
      'composant de flux jamais monté ; ses TYPES étaient vivants et ont été déplacés dans lib/activity-types.ts',
  },
  {
    chemin: '../components/client/dashboard/rewards-card.tsx',
    composant: 'RewardsCard',
    raison: 'enrobage du composant partagé reward-progress-card, lui aussi jamais monté',
  },
];

void test('les composants retirés ne reviennent pas', () => {
  for (const { chemin, composant } of RETIRÉS) {
    assert.ok(
      !existsSync(new URL(chemin, import.meta.url)),
      `${composant} : le fichier est de retour`,
    );
  }
});

void test('aucun code ne référence encore ces composants', () => {
  /* Une référence résiduelle est plus grave que le fichier lui-même : elle
   * corpse à compiler sans jamais être affichée. */
  for (const { composant } of RETIRÉS) {
    const coupables: string[] = [];
    /* Ce fichier se.scanne lui-même : il contient forcément le nom qu'il
     * surveille. On l'exclut — sinon il ne peut qu'échouer. */
    for (const chemin of listerSources().filter((c) => !c.endsWith('dead-code-guard.test.ts'))) {
      const contenu = lire(chemin);
      if (contenu.includes(composant)) coupables.push(chemin);
    }
    assert.deepEqual(coupables, [], `${composant} encore référencé ici : ${coupables.join(', ')}`);
  }
});

void test('les types du flux d’activité ont un chez-vous à eux', () => {
  /* Ils ont survécu au composant dont ils dépendaient. S’ils disparaissaient
   * avec lui, l’espace technicien ne compilerait plus — c’est le `tsc` qui
   * le dirait, mais le dire à la bonne place vaut mieux qu’à la dérive. */
  const types = read('../lib/activity-types.ts');
  assert.match(types, /export type ActivityTone/);
  assert.match(types, /export interface ActivityItem/);
  /* Un seul chemin vers la définition : deux chemins pour un type, c’est deux
   * réponses à « lequel est le bon ? ». */
  /* Un ré-export laisserait deux chemins vers la meme definition : deux
   * chemins pour un type, c'est deux réponses a « lequel est le bon ? ». */
  const reExport = new RegExp('export' + ' \\* from');
  assert.doesNotMatch(types, reExport);
});

void test('le dossier dashboard client ne contient plus de fichier mort', () => {
  /* Contrôle de surface, volontairement modeste : on compte ce qui est
   * réellement importé ailleurs dans `src/`. Un composant importé nulle part
   * et non exporté par un barrel est mort, quoi qu’en dise son en-tête. */
  const dossier = new URL('../components/client/dashboard/', import.meta.url);
  const fichiers = readdirSync(dossier).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'));
  const sources = listerSources().filter((c) => !c.includes('client/dashboard/'));

  const morts = fichiers.filter((fichier) => {
    const nom = fichier.replace(/\.tsx?$/, '');
    return !sources.some((source) => lire(source).includes(nom));
  });

  assert.deepEqual(
    morts,
    [],
    `fichier(s) du dossier dashboard non importé(s) ailleurs : ${morts.join(', ')}`,
  );
});

/* ── Outils ────────────────────────────────────────────────────────── */

function listerSources(): string[] {
  const racine = new URL('../../', import.meta.url);
  return explorer(racine, '');
}

function explorer(racine: URL, prefixe: string): string[] {
  const dossier = new URL(prefixe, racine);
  const sortie: string[] = [];
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    const chemin = `${prefixe}${entree.name}`;
    if (entree.isDirectory()) {
      if (entree.name === 'node_modules') continue;
      sortie.push(...explorer(racine, `${chemin}/`));
    } else if (/\.(ts|tsx)$/.test(entree.name)) {
      sortie.push(chemin);
    }
  }
  return sortie;
}

function lire(chemin: string): string {
  return readFileSync(new URL(chemin, new URL('../../', import.meta.url)), 'utf8');
}