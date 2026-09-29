# Relio — Règle permanente d'architecture UI/UX (Desktop & Mobile)

> **Tout développeur, codeur ou agent IA intervenant sur le frontend Relio
> doit lire et respecter ce document avant toute modification UI/UX.**
> Cette règle est une contrainte d'architecture du projet, au même titre
> que les Guards backend ou les règles financières.

## 1. Règle fondamentale

Relio possède **deux expériences UI/UX distinctes : Desktop et Mobile**.

Même application, mêmes données, mêmes APIs, mêmes règles métier et mêmes
permissions — mais une présentation adaptée au support.

**Desktop** (ordinateur, écran large, souris/clavier) : sidebar, navigation
complète, tableaux, plusieurs colonnes, informations secondaires visibles.

**Mobile** (smartphone, tactile, petit écran) : BottomNav + menus Plus +
sheets, cards/listes verticales, actions prioritaires, contenu priorisé.

## 2. Interdiction de réintroduire le couplage

> Une modification de l'interface Mobile ne doit jamais déformer ni casser
> l'interface Desktop. Et inversement.

Il est interdit de résoudre un problème mobile en modifiant une structure
desktop lorsque ce n'est pas nécessaire à desktop, et inversement.

## 3. Responsive ≠ interface mobile

Les media queries restent autorisées pour : largeur, spacing, taille,
grille, typographie, petites adaptations. Elles ne doivent pas transformer
une interface desktop complète en interface mobile. Quand la structure
diverge réellement, privilégier :

```text
Component
├── DesktopView
└── MobileView
```

## 4. Architecture à respecter

Commun (ne jamais dupliquer) : données, hooks métier, services, types,
authentification, permissions, validations métier, modèles. La séparation
concerne la **présentation et l'expérience** uniquement.

Référence d'implémentation : `src/lib/use-viewport.ts`,
`src/components/ui/responsive-view.tsx`, pilote
`src/components/client/dashboard/` (hook partagé + vues isolées).

## 5. Avant toute nouvelle UI

1. Existe-t-elle sur Desktop ? Comment doit-elle s'y présenter ?
2. Comment doit-elle se présenter sur Mobile ?
3. La structure est-elle réellement différente ? Si oui → vues
   Desktop + Mobile ; sinon → composant commun.

## 6. Détection du support (centralisée)

Interdit : `window.innerWidth` dispersé, `isMobile ? <A/> : <B/>`
systématique, dizaines de `useEffect` indépendants. Utiliser
`useViewport()` / `ResponsiveView` (SSR-safe : `mounted`, fallback sans
flash ni hydration mismatch). Toute nouvelle abstraction doit être
centralisée et documentée.

## 7. Navigation

Desktop : Sidebar + Header + menus desktop. Mobile : BottomNav + Plus +
sheets tactiles. Ne jamais transformer la sidebar en pseudo-navigation
mobile, ni supprimer la navigation mobile au profit de la sidebar.

## 8. Design system

Réutiliser en priorité : Button, Card, Input, Select, Alert, Badge,
EmptyState, loaders, navigation. Couleurs douces, lisibles, sémantiques
(success/warning/error/info) ; tokens Relio existants avant toute nouvelle
couleur (jamais de hex arbitraire, jamais `black`/`gray-950`/`gray-900` en
fond). Contraste toujours vérifié (texte/background, bouton/texte,
input/placeholder, badge et alert/texte). Pas de nouvelle librairie UI,
pas de refonte d'identité (orange Relio `#F97316`).

## 9. Règles par domaine

- **Tableaux** : vrais tableaux sur desktop ; cards/listes/scroll contrôlé
  sur mobile (jamais de tableau illisible).
- **Modales** : centrée sur desktop ; sheet ou plein écran tactile sur
  mobile. Comportement métier identique.
- **Formulaires** : multi-colonnes possibles sur desktop ; une colonne
  tactile sur mobile. Ne jamais modifier les validations pour l'UI.
- **GPS** : carte + infos + actions adaptées par support ; jamais de
  logique backend modifiée pour l'UI.
- **Finances** : présentations libres, mais mêmes montants, APIs, règles
  et états (aucune logique financière par support).

## 10. Ni mobile-first ni desktop-first aveugle

> Chaque interface doit être pensée pour son support.

## 11. Validation obligatoire

Vérifier au minimum : mobile 320/360/390/430 px, desktop
1024/1280/1440/1920 px. Une modification qui améliore un support en
cassant l'autre n'est pas terminée.

Checklist : vues Desktop/Mobile identifiées ? Impact sur les deux
volontaire ? Layouts des deux vérifiés ? Tokens respectés ? Composants
existants réutilisés ? Logique métier non dupliquée ? Petits et grands
écrans testés ?

## 12. Protection du présent document

Ce document ne doit pas être modifié ou supprimé dans une simple tâche UI.
Toute évolution substantielle doit être identifiée comme décision
d'architecture, justifiée, validée — jamais introduite silencieusement.
Ne pas le contourner au prétexte de la rapidité.
