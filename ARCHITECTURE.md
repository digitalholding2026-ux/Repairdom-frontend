# Architecture frontend — Relio

> Règles structurantes du dépôt `Repairdom-frontend` (Next.js 15 App Router,
> déployé sur Vercel). À lire avant toute modification des mécanismes
> d'authentification ou de protection des routes.

## Pourquoi il n'y a PAS de middleware.ts

### Contexte

- Le frontend est hébergé sur `www.relioo.space` (Vercel).
- Le backend est hébergé sur un domaine Railway distinct
  (`repairdom-backend-production-4922.up.railway.app`).
- L'authentification repose sur le cookie HttpOnly `repairdom_token`,
  posé par le backend **sur son propre domaine**.

### Conséquence

Ces deux domaines sont **cross-site**. Un cookie posé par Railway n'est
JAMAIS visible par le code qui tourne sur le domaine Vercel : ni en
JavaScript (`document.cookie` — de toute façon HttpOnly), ni dans un
`middleware.ts` Next.js (qui ne voit que les cookies du domaine frontend).
Le navigateur, lui, envoie correctement le cookie vers Railway sur les
`fetch` avec `credentials: 'include'` — c'est la seule lecture qui fonctionne.

Historique : un `middleware.ts` lisant `repairdom_token` pour protéger les
routes a été livré puis a dû être supprimé en urgence (P0) : ne voyant jamais
le cookie, il redirigeait 100 % des utilisateurs connectés vers `/connexion`,
sur tous les rôles (CLIENT, TECHNICIAN, ADMIN).

### Règle

Il est **INTERDIT** d'ajouter un `middleware.ts` (ou `middleware.js`) à la
racine de `src/` qui tenterait de lire `repairdom_token` pour rediriger ou
autoriser une route. Un tel middleware casserait l'accès à tous les
dashboards. Cette interdiction est verrouillée par le test automatique
`src/lib/no-middleware.test.ts` (la suite `npm run test:unit` échoue si le
fichier existe).

### Alternative officielle

La protection des routes est assurée côté client par :
- `AuthProvider` (`src/components/auth/auth-provider.tsx`), qui valide la
  session via `GET /auth/me` en fetch cross-domain avec
  `credentials: 'include'` ;
- `RoleGuard` (`src/components/auth/role-guard.tsx`, décision pure testée
  dans `src/lib/guard-decision.ts`), qui affiche un écran de chargement
  neutre pendant la vérification puis redirige si besoin (`?redirect=`).

Le frontend ne doit JAMAIS lire `repairdom_token` directement (ni
`document.cookie`, ni `cookies()` de `next/headers`) : toute lecture directe
est un signe de bug, également verrouillée par test automatique.

### Si un jour le backend migre sur `api.relioo.space`

Cette règle pourra être révisée, MAIS uniquement après avoir vérifié
explicitement **en production** que le cookie est bien partagé entre les
deux sous-domaines (même domaine racine `relioo.space`, attributs
`Domain`/`SameSite` compatibles). Dans ce cas, mettre à jour ce fichier
ET le test `no-middleware.test.ts` dans le même commit.
