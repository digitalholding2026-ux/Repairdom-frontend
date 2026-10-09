/* Hook `resolve` du runner `node --test` — voir `register-test-alias.mjs`.
 *
 * Appelé par le module de registre pour chaque specifier avant la résolution
 * standard de Node. Si une réécriture aboutit, elle est renvoyée ;
 * sinon on délègue à `next`, donc le comportement par défaut est intégralement
 * préservé. */

import { pathToFileURL, fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

/* Racine des sources, déduite de l'emplacement de ce fichier :
 * `<frontend>/scripts/` → `<frontend>/src`. Aucun chemin en dur : le dépôt
 * reste déplaçable. */
const SRC_ROOT = fileURLToPath(new URL('../src/', import.meta.url));

/* Résout un chemin sans extension vers un fichier réel, dans l'ordre utilisé
 * par le résolveur de TypeScript. `null` si rien ne correspond — l'appelant
 *sinon on délègue à Node, qui produira son propre message d'erreur. */
function resolveFile(absolutePath) {
  if (existsSync(absolutePath)) return absolutePath;
  for (const suffix of ['.ts', '.tsx', '/index.ts']) {
    if (existsSync(absolutePath + suffix)) return absolutePath + suffix;
  }
  return null;
}

/** Une specifier a-t-elle déjà une extension de fichier ? */
function hasExtension(specifier) {
  return /\.[cm]?[jt]sx?$/.test(specifier);
}

export function resolve(specifier, context, next) {
  // 1. Alias `@/` — celui de tsconfig.json (`"@/*": ["./src/*"]`).
  if (specifier.startsWith('@/')) {
    const hit = resolveFile(`${SRC_ROOT}/${specifier.slice(2)}`);
    if (hit) return next(pathToFileURL(hit).href, context);
  }

  // 2. Import relatif sans extension — accepté par TypeScript, refusé par
  //    Node en ESM. C'est le second motif de ce dépôt (`./api-error`).
  if (specifier.startsWith('.') && context.parentURL && !hasExtension(specifier)) {
    const hit = resolveFile(fileURLToPath(new URL(specifier, context.parentURL)));
    if (hit) return next(pathToFileURL(hit).href, context);
  }

  return next(specifier, context);
}
