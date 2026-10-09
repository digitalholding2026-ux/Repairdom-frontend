/* Loader de résolution pour le runner `node --test`.
 *
 * PROBLÈME RÉSOLU
 * Le dépôt importe ses modules avec l'alias `@/` (convention Next.js, définie
 * dans `tsconfig.json`). Le runner natif `node --test` ne lit PAS le
 * tsconfig : tout test qui importe un module du produit — et non seulement
 * son fichier source — échouait sur
 * `Cannot find package '@/lib' imported from …`.
 *
 * `demande-draft-sync.test.ts` était le seul fichier dans ce cas, et ses
 * 25 tests ne s'exécutaient donc pas du tout : le fichier était ramassé par
 * `npm run test:unit` et échouait en une seule erreur de chargement, ce qui
 * masquait les 25 assertions qu'il contient.
 *
 * CE QUE FAIT CE FICHIER
 * Un hook `resolve` qui réécrit deux formes d'import :
 *   1. `@/x/y`  → `<src>/x/y` (plus `.ts` / `.tsx` / `/index.ts` si besoin) ;
 *   2. `./x`    → `<dossier>/x.ts` quand l'extension est omise, comme le fait
 *                 le résolveur de TypeScript.
 *
 * CE QUE CE FICHIER NE FAIT PAS
 * Il n'ajoute AUCUNE dépendance : il n'utilise que `node:module`,
 * `node:url` et `node:fs`. Il ne modifie aucun fichier de l'application et ne
 * change aucun comportement — il rend seulement les imports que TypeScript
 * résout déjà lisibles par le runner.
 *
 * ⚠️ LIMITE ASSUMÉE
 * Le hook ne touche que ce que Node sait déjà charger : il ne compile pas
 * TypeScript. Un module contenant des `type` exportés et испольaçables par un
 * `import` de valeur resterait à exclure — c'est la raison pour laquelle
 * `tsconfig.json` liste les fichiers de test dans `exclude` (ils sont écrits
 * pour le runner natif, pas pour `tsc`). */

import { register } from 'node:module';

register('./test-alias-resolver.mjs', import.meta.url);
