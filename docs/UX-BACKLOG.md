# Backlog frontend — suivi de chantiers Relio

> Notes de suivi opened après chaque chantier frontend. Chaque entrée est
> **factuelle** : ce qui a été constaté, où, et ce qui reste à vérifier.
>
> Le pendant backend est `backend/docs/UX-BACKLOG.md`. Les deux sont
> volontairement séparés : les domaines ne se mélangent pas.

---

## Chantier 6A — refonte écran mission client

- [ ] **Aucun test de rendu React dans le dépôt.** `npm run test:unit` est un
  `node --test` sur des `.ts` purs ; l'alias `@/` n'est pas résolu. Toute la
  couverture frontend est donc **statique** (lecture de source). Les scénarios
  de production 1 à 6 du chantier n'ont pas pu être joués en local : le
  comportement réel n'est vérifié qu'après push Vercel, à la main.
      → Piste : introduire une bibliothèque de test de composants, ou accepter
      explicitement que la vérification UI est manuelle et post-déploiement.

## Chantier 6B — refonte écran mission technicien

- [ ] **Le composant principal fait 1 219 lignes**, au-dessus du seuil de 1 200
  fixé par le chantier. L'écart vient des commentaires de cadrage en tête de
  section.
      → Deux voies : alléger les commentaires, ou sortir `DetailsTab` dans un
      fichier séparé. La seconde casserait `dispute-status.test.ts`, qui lit
      `getDispute` et l'absence de POST par chemin de fichier. À trancher si
      le prochain chantier touche encore cette page.

## Chantier 6C-1 — erreurs silencieuses

### ⚠️ À VÉRIFIER À CHAQUE REFONTE : les effets déplacés silencieusement

- [ ] **Contrôler la liste des effets avant ET après une réorganisation.**
      Le chantier 6A a réécrit le composant `ClientDemandeDetailPage` sans
      changer le comportement observé : le bloc de lecture du solde est resté
      dans le flux de chargement de la mission, où il était redondant mais
      inoffensif. **Aucun test n'a bronché** — le comportement était identique.
      C'est le chantier 6C-1, deux jours plus tard, qui a constaté que ce bloc
      était mal placé (échec réseau du solde ⇒ échec du chargement de la
      mission entier, et « Réessayer » qui rechargeait tout).
      **Rien ne l'avait signalé : ni `tsc`, ni les tests, ni le lint.** Seule
      une relecture ciblée l'a vu.
      → Réflexe à prendre : avant de commiter une refonte, faire un diff
      **des effets** (`useEffect`/`useState`) et non seulement du JSX rendu,
      et vérifier que chaque appel réseau est toujours attaché au même
      déclenchement qu'avant. Un test qui couvre « le rendu » ne couvre pas
      « le moment où la donnée est demandée ».

- [ ] **Un état « chargement » qui se dégrade en « valeur par défaut » sans
      le dire.** Trois fois dans ce dépôt, le même schéma : un `catch` qui
      avale l'erreur, un state laissé à sa valeur initiale, et une garde
      applicative qui court-circuite sur cette valeur (`balance && …`).
      → Symptôme commun : un bouton actif, un clic, et un refus backend
      opaque. Le pattern de correction est dans `saspay-fees`-style : état
      trinominal `loading | loaded | error` + bandeau explicite + « Réessayer ».
      À appliquer à toute future lecture « best effort » (`getDispute`,
      `listDemandeDiagnostics`, `listDemandeQuotes` sont encore en `catch`
      silencieux côté client).

### Autres suivis

- [ ] `getDispute` reste silencieux côté client (`.catch(() => undefined)`) :
  un litige ouvert devient invisible si l'appel échoue. Non traité en 6C-1 car
  le scénario est moins grave (la mission reste consultable, la confirmation
  est bloquée par le backend de toute façon).
- [ ] `listDemandeDiagnostics` et `listDemandeQuotes` restent silencieux côté
  client : un diagnostic ou un devis non chargé se lit comme « pas encore
  publié ». Le chantier 6C-1 n'a traité que la chronologie et le solde.