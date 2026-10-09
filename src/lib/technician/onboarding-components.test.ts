/* Chantier #5C — checklist, bannière et page d'onboarding technicien.
 *
 * Ces tests portent sur des CONTRACTS vérifiés par lecture statique des
 * sources (convention du dépôt, cf. `technician-auth.test.ts`) : le rendu
 * React n'est pas monté — aucune bibliothèque de rendu n'est introduite. La
 * logique de calcul des étapes, elle, est EXÉCUTÉE dans
 * `onboarding-steps.test.ts` ; ici on verrouille le câblage des composants.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');

const checklist = read('../../components/technician/onboarding/onboarding-checklist.tsx');
const banner = read('../../components/technician/onboarding/onboarding-banner.tsx');
const progressBar = read('../../components/technician/onboarding/onboarding-progress-bar.tsx');
const bannerVisibility = read('./use-onboarding-banner-visibility.ts');
const dashboard = read('../../app/technicien/page.tsx');
const onboardingPage = read('../../app/technicien/onboarding/page.tsx');

/* Nombre d'étapes défini par `ONBOARDING_STEP_DEFS`, vérifié en exécution
 * dans `onboarding-steps.test.ts`. Constant mirroré ici pour que ce fichier
 * reste auto-suffisant. */
const ONBOARDING_STEP_COUNT = 4;

/* ── B — checklist ─────────────────────────────────────────────────────── */

void test('#5C — la checklist rend les 4 étapes dans une liste <ol>/<li>', () => {
  assert.match(checklist, /<ol className="[^"]*">/);
  assert.match(checklist, /\{state\.steps\.map\(\(step\) => \(/);
  assert.match(checklist, /<li key=\{step\.id\}>/);
  // Le nombre d'étapes vient de `ONBOARDING_STEP_DEFS`, vérifié en exécution
  // dans `onboarding-steps.test.ts`.
  assert.equal(ONBOARDING_STEP_COUNT, 4);
});

void test('#5C — une étape done a l’icône success et AUCUN CTA', () => {
  // Branche `step.done` : icône check-circle…
  assert.match(checklist, /step\.done \? \(/);
  assert.match(checklist, /name="check-circle"/);

  // …et surtout PAS de lien « Compléter » : un leurre sur une étape faite.
  //
  // La branche est isolée par SES PROPRES DÉLIMITEURS `{step.done ? ( … ) : (`,
  // jamais par une recherche de mot : « Compléter » figure déjà dans le
  // commentaire d'en-tête du composant, et « <Link » apparaît dans la
  // branche suivante — l'une ou l'autre délimitation tronquerait la tranche
  // et l'assertion passerait au vide, sans rien vérifier.
  const doneStart = checklist.indexOf('{step.done ? (');
  const elseStart = checklist.indexOf(') : (', doneStart);
  assert.ok(doneStart > -1 && elseStart > doneStart, 'bornes de la branche done trouvées');
  const doneBranch = checklist.slice(doneStart, elseStart);
  assert.match(doneBranch, /check-circle/, 'la tranche contient bien le rendu');
  assert.doesNotMatch(doneBranch, /<Link/);
  assert.doesNotMatch(doneBranch, /step\.href/);
});

void test('#5C — une étape pending porte un CTA vers step.href', () => {
  assert.match(checklist, /<Link\s+href=\{step\.href\}/);
  assert.match(checklist, /Compléter/);
  /* Le libellé du CTA est explicite pour les lecteurs d'écran : « Compléter »
   * seul ne dit pas QUOI. */
  assert.match(checklist, /<span className="sr-only"> : \{step\.title\}<\/span>/);
});

void test('#5C — le compteur et la barre de progression sont exposés', () => {
  assert.match(progressBar, /role="progressbar"/);
  assert.match(progressBar, /aria-valuenow=\{completedCount\}/);
  assert.match(progressBar, /aria-valuemax=\{safeTotal\}/);
  /* Le libellé est dynamique : « 0 / 4 », « 4 / 4 ». */
  assert.match(progressBar, /\{completedCount\} \/ \{totalCount\} étapes complétées/);
  assert.match(checklist, /<OnboardingProgressBar/);
});

void test('#5C — le lien vers le guide complet pointe vers la page dédiée', () => {
  assert.match(checklist, /href="\/technicien\/onboarding"/);
  assert.match(checklist, /Voir le guide complet/);
});

void test('#5C — la checklist respecte le thème sombre du dashboard', () => {
  // Le dashboard est en thème SOMBRE forcé : la carte ne doit pas utiliser les
  // jetons `bg-card` (carte CLAIRE sur fond `relio-bg`), sauf en ton light.
  assert.match(checklist, /tone\?: OnboardingTone/);
  assert.match(checklist, /dark \? 'border-white\/10 bg-white\/5' : 'border-border bg-card'/);
  // Le dashboard passe bien `tone="dark"`.
  assert.match(dashboard, /<OnboardingChecklist state=\{onboarding\} tone="dark" \/>/);
});

/* ── C — intégration dashboard ──────────────────────────────────────────── */

void test('#5C — le dashboard n’affiche la checklist QUE si l’onboarding est incomplet', () => {
  assert.match(
    dashboard,
    /const showChecklist = !onboarding\.loading && !onboarding\.error && !onboarding\.isComplete;/,
  );
  // Ni pendant le chargement (sinon clignotement 0/4), ni sur erreur réseau
  // (une checklist à 0/4 mentirait sur la situation réelle).
  assert.match(dashboard, /!onboarding\.loading && !onboarding\.error && !onboarding\.isComplete/);
});

void test('#5C — la checklist reste avant le bandeau KYC, et la mission passe devant', () => {
  /* INTENTION, ET NON POSITION ABSOLUE.
   *
   * Ce test disait « la checklist est placée après l'en-tête ». La mission en
   * cours est désormais remontée entre les deux : c'est l'élément le plus
   * temporel de l'écran et il était le sixième bloc, donc hors du premier
   * écran sur un téléphone.
   *
   * L'invariant qu'on cherche à protéger n'est donc plus « juste après », mais
   * l'ordre de PRIORITÉ : une intervention acceptée passe avant l paperwork,
   * et le paperwork passe avant le bandeau KYC. Un test qui continue
   * d'exiger une position absolue bloquerait cette amélioration — ou pire,
   * donnerait l'impression de la garantir alors qu'elle n'est plus vrai.
   */
  const header = dashboard.indexOf('</header>');
  const missionAt = dashboard.indexOf('Intervention en cours');
  const checklistAt = dashboard.indexOf('<OnboardingChecklist');
  const kycAt = dashboard.indexOf('kycBanner ? (');

  assert.ok(header > -1 && missionAt > header, 'la mission doit suivre l’en-tête');
  assert.ok(missionAt < checklistAt, 'la mission passe avant la checklist');
  /* Invariant d'origine, inchangé : la checklist reste avant le bandeau KYC
   * (chantier #5A), quel que soit le nombre de blocs ajoutés au-dessus. */
  assert.ok(checklistAt < kycAt, 'checklist avant le bandeau KYC #5A');
});

void test('#5C — le dashboard existant est intact (KPI, radar, toggle disponibilité)', () => {
  for (const marker of [
    'TechStatusCard',
    'InterventionsCard',
    'handleToggleAvailability',
    'updateTechnicianAvailability',
    'refreshAvailable',
  ]) {
    assert.ok(dashboard.includes(marker), `${marker} toujours présent`);
  }
});

/* ── D — bannière ───────────────────────────────────────────────────────── */

void test('#5C — la bannière s’affiche au premier passage si l’onboarding est incomplet', () => {
  assert.match(
    dashboard,
    /const showBanner =\s*onboardingBanner\.ready &&\s*!onboardingBanner\.dismissed &&\s*!onboarding\.loading &&\s*!onboarding\.error &&\s*!onboarding\.isComplete;/,
  );
  assert.match(dashboard, /<OnboardingBanner/);
});

void test('#5C — le dismissal est persisté dans localStorage sous la clé attendue', () => {
  assert.match(banner, /ONBOARDING_BANNER_STORAGE_KEY = 'relio_onboarding_banner_dismissed'/);
  assert.match(bannerVisibility, /localStorage\.setItem\(ONBOARDING_BANNER_STORAGE_KEY, 'true'\)/);
  assert.match(bannerVisibility, /localStorage\.getItem\(ONBOARDING_BANNER_STORAGE_KEY\)/);
  /* Une fois dismissed = « true », la bannière ne revient pas. */
  assert.match(bannerVisibility, /setDismissed\(value === 'true'\)/);
});

void test('#5C — le CTA de la bannière la consomme aussi (le technicien est en route)', () => {
  assert.match(banner, /href="\/technicien\/onboarding"/);
  assert.match(dashboard, /onNavigate=\{onboardingBanner\.dismiss\}/);
  assert.match(dashboard, /onDismiss=\{onboardingBanner\.dismiss\}/);
});

void test('#5C — la bannière a une croix ET un libellé accessible', () => {
  assert.match(banner, /onClick=\{dismiss\}/);
  assert.match(banner, /aria-label="Masquer ce message"/);
  assert.match(banner, /name="x"/);
});

void test('#5C — la lecture de localStorage est différée au montage (pas d’écart hydratation)', () => {
  // `ready` garde la bannière masquée tant que le montage n'a pas eu lieu :
  // sinon elle apparaîtrait au rendu serveur (localStorage indéfini).
  assert.match(bannerVisibility, /const \[ready, setReady\] = useState\(false\)/);
  assert.match(bannerVisibility, /useEffect\(\(\) => \{/);
  assert.match(dashboard, /onboardingBanner\.ready &&/);
});

void test('#5C — un stockage indisponible ne casse pas le dashboard', () => {
  assert.match(bannerVisibility, /catch \{/);
});

/* ── E — page /technicien/onboarding ───────────────────────────────────── */

void test('#5C — la page rend les 4 étapes avec leur statut', () => {
  assert.match(onboardingPage, /\{state\.steps\.map\(\(step\) => \{/);
  assert.match(onboardingPage, /<li key=\{step\.id\}>/);
  assert.match(onboardingPage, /step\.done \? 'Terminé' : 'À faire'/);
  /* Écran de chargement explicite plutôt qu'une liste à 0/4 qui ment. */
  assert.match(onboardingPage, /Chargement de votre progression/);
  assert.match(onboardingPage, /state\.loading/);
});

void test('#5C — l’étape à faire porte aria-current="step"', () => {
  assert.match(onboardingPage, /aria-current=\{isNext \? 'step' : undefined\}/);
  assert.match(onboardingPage, /const isNext = state\.next\?\.id === step\.id;/);
});

void test('#5C — l’état 100 % affiche le message de succès et les bons CTA', () => {
  assert.match(onboardingPage, /state\.isComplete \? \(/);
  assert.match(onboardingPage, /Vous êtes prêt à recevoir des missions !/);
  assert.match(onboardingPage, /href="\/technicien\/demandes"/);
  assert.match(onboardingPage, /Voir les missions disponibles/);
  assert.match(onboardingPage, /href="\/technicien"/);
  assert.match(onboardingPage, /Retour au dashboard/);
});

void test('#5C — l’état 100 % ne réaffiche PAS la liste des 4 étapes', () => {
  // Une liste cochée n'apprend rien et repousse l'action utile : l'état
  // complet doit proposer les missions, pas l'historique de l'installation.
  const completeBranch = onboardingPage.slice(
    onboardingPage.indexOf('state.isComplete ? ('),
    onboardingPage.indexOf('OnboardingProgressBar'),
  );
  assert.doesNotMatch(completeBranch, /state\.steps\.map/);
});

void test('#5C — la page propose le retour au dashboard', () => {
  assert.match(onboardingPage, /<PageHeader/);
  assert.match(onboardingPage, /title="Finalisez votre installation"/);
  assert.match(onboardingPage, /4 étapes pour commencer à recevoir des missions\./);
});

/* ── Garde-fous du chantier ────────────────────────────────────────────── */

void test('#5C — aucun auto-redirect vers /onboarding', () => {
  for (const source of [dashboard, onboardingPage]) {
    assert.doesNotMatch(source, /router\.(push|replace)\('\/technicien\/onboarding'/);
  }
});

void test('#5C — la checklist n’est posée que sur le dashboard', () => {
  // Un seul appel dans tout l'espace technicien.
  assert.equal((dashboard.match(/<OnboardingChecklist/g) ?? []).length, 1);
  assert.doesNotMatch(onboardingPage, /OnboardingChecklist/);
});
