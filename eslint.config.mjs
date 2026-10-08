/* ESLint — RÈGLE DES HOOKS UNIQUEMENT.
 *
 * Pourquoi ce fichier existe : `oxlint` (le lint principal du dépôt) n'a
 * AUCUNE règle react-hooks — vérifié sur la version installée :
 *   npx oxlint --rules | grep -i hook   →  aucun résultat
 * ni `rules-of-hooks` ni `exhaustive-deps`. Or ces règles sont la SEULE
 * détection fiable d'un hook appelé après un `return` conditionnel, faute
 * de quoi `tsc` est aveugle (il ne voit pas l'ordre des hooks) et les tests
 * unitaires statiques passent à vide.
 *
 * Régression/outillage : le chantier 4-FONDATIONS-A a ajouté un `useMemo`
 * ligne 447 de `src/app/technicien/demandes/[id]/page.tsx`, après les
 * returns `if (loading)` / `if (error && !demande)` / `if (!demande)`. Le
 * nombre de hooks variait entre deux rendus : React levait « Rendered more
 * hooks than during the previous render » et TOUTE page détail mission
 * technicien tombait sur `src/app/error.tsx`.
 *
 * Périmètre volontairement MINIMAL : uniquement ces deux règles, sur
 * `src/`. Le reste du linting (rapide, sans configuration) reste oxlint.
 * On n'active pas `no-unused-vars`, `no-console`… : ce n'est pas la mission
 * de ce fichier, et un lint large produirait des centaines d'avertissements
 * hors sujet. `exhaustive-deps` est en `warn` (recommandation React, pas une
 * faute bloquante) ; `rules-of-hooks` est en `error`.
 */
import tseslint from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';

/* Stub local, ZÉRO dépendance.
 *
 * Plusieurs fichiers du dépôt contiennent des directives
 * `eslint-disable-next-line @next/next/no-img-element` (écrites pour le lint
 * Next). Ce lint ne charge PAS `eslint-plugin-next` — volontairement, pour
 * rester minimal. Sans stub, ESLint échoue sur ces directives avec
 * « Definition for rule '@next/next/no-img-element' was not found », ce qui
 * ferait échouer le lint sur des fichiers hors périmètre.
 *
 * Le stub rend la directive résoluble ; la règle reste `off` (ce lint ne
 * traite pas du HTML d'image). */
const nextDirectiveStub = {
  rules: {
    'no-img-element': { meta: { schema: [] }, create: () => ({}) },
  },
};

export default [
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    plugins: { 'react-hooks': reactHooks, '@next/next': nextDirectiveStub },
    languageOptions: {
      parser: tseslint,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    linterOptions: {
      /* Les directives `eslint-disable` préexistantes et devenues inutiles
       * (ex. `react-hooks/exhaustive-deps` sur un `useEffect` déjà complet)
       * sont signalées SANS bruit : ce n'est pas l'objet de ce lint. */
      reportUnusedDisableDirectives: 'off',
    },
    rules: {
      '@next/next/no-img-element': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    /* Les tests unitaires ne montent aucun composant : les deux règles n'ont
     * rien à y dire et they'd only add noise. */
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
    },
  },
];