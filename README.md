# RepairDom — Frontend

Interface web **mobile-first** du SaaS RepairDom, construite avec **Next.js (App Router)**,
**TypeScript**, **Tailwind CSS v4** et un socle de composants UI réutilisables.

> Ce dépôt correspond uniquement au frontend. Le backend (API NestJS) vit dans
> le dépôt `Repairdom-backend` (dossier `backend/`).

## Prérequis

- Node.js >= 20
- npm (ou le gestionnaire de paquets de votre choix)

## Installation

```bash
npm install
cp .env.example .env.local   # puis adapter les valeurs
```

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

## Variables d’environnement

Voir `.env.example`. Seules les variables préfixées `NEXT_PUBLIC_` sont exposées au navigateur.

## Déploiement (Vercel)

1. Importer le dépôt dans Vercel.
2. Définir les variables d’environnement (`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`).
3. Le build par défaut (`npm run build`) est déjà configuré dans `package.json`.