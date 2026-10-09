# RepairDom — Frontend

> ⚠️ Ce projet ne contient volontairement PAS de `middleware.ts`. Voir
> `ARCHITECTURE.md` pour la raison (architecture cross-domain Vercel + Railway).

Interface web **mobile-first** du SaaS RepairDom, construite avec **Next.js (App Router)**,
**TypeScript**, **Tailwind CSS v4** et un socle de composants UI réutilisables.

> Ce dépôt correspond uniquement au frontend. Le backend (API NestJS) vit dans
> le dépôt `Repairdom-backend` (dossier `backend/`).

## Prérequis

- **Node.js >= 22** (la version est épinglée dans `.nvmrc` : `nvm use`)
- npm (ou le gestionnaire de paquets de votre choix)

> Pourquoi 22 et pas 20 : la suite de tests utilise le runner `.ts` natif de
> `node --test`, disponible à partir de Node 22. Sur Node 20, `npm run
> test:unit` échoue à la résolution des modules TypeScript. Le `package.json`
> du backend déclare la même contrainte dans `engines`.

## Installation

```bash
nvm use            # lit .nvmrc → Node 22
npm install
cp .env.example .env.local   # puis adapter les valeurs
```

## Tests

```bash
npm run test:unit   # runner natif, aucun serveur requis
npm run typecheck   # tsc --noEmit
npm run lint        # oxlint + eslint
```

`test:unit` charge `scripts/register-test-alias.mjs`, un hook de résolution qui
donne au runner natif l'alias `@/` de `tsconfig.json`. Sans lui, tout test
important un module du produit échouait sur `Cannot find package '@/lib'`.

## Lancement en local

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Scripts

| Commande          | Description                                      |
|-------------------|--------------------------------------------------|
| `npm run dev`     | Serveur de développement (HMR)                   |
| `npm run build`   | Build de production                              |
| `npm run start`   | Serveur de production après `build`              |
| `npm run lint`    | Analyse de code (oxlint)                         |
| `npm run typecheck` | Vérification TypeScript (`tsc --noEmit`)       |

## Architecture

```
src/
├── app/              # App Router (routes, layouts, loading/error/not-found)
├── components/
│   ├── ui/           # Composants UI réutilisables (design system)
│   └── ...           # Composants métier à venir
└── lib/              # Utilitaires et configuration
```

## Règle UI/UX permanente (Desktop & Mobile)

> **Avant toute modification UI/UX, lire et respecter
> [`docs/UI-UX-ARCHITECTURE.md`](docs/UI-UX-ARCHITECTURE.md)** (contrainte
> d'architecture : deux expériences Desktop/Mobile, données communes,
> mécanisme `useViewport`/`ResponsiveView`, tokens Relio). Cela s'applique
> aussi aux agents IA intervenant sur le frontend.

## Variables d’environnement

Voir `.env.example`. Seules les variables préfixées `NEXT_PUBLIC_` sont exposées au navigateur.

## Déploiement (Vercel)

1. Importer le dépôt dans Vercel.
2. Définir les variables d’environnement (`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`).
3. Le build par défaut (`npm run build`) est déjà configuré dans `package.json`.