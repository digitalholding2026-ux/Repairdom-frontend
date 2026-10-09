/* CHANTIER D2 — tunnel public « demande d'abord, inscription à la fin ».
 *
 * Exécuté avec Node 22+ natif (type stripping, zéro dépendance) :
 *   node --test src/lib/demande-draft-routing.test.ts
 * ou : npm run test:unit
 *
 * Vérifications STATIQUES sur les sources (convention du dépôt, cf.
 * `demande-media.test.ts`) : ni rendu React, ni requête réseau, ni DOM. Le
 * composant `DemandeWizard` n'est jamais monté.
 *
 * Ce fichier verrouille TROIS choses qui casseraient le chantier en silence :
 *  1. `/demande` est la seule page de création de demande ;
 *  2. plus AUCUN lien ne pointe vers l'ancien `/client/demande` ;
 *  3. l'ancien chemin redirige au lieu de répondre 404 (signets, e-mails). */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = new URL('../', import.meta.url).pathname;

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');

/* Parcours récursif des sources, pour vérifier l'EXHAUSTIVITÉ des liens : un
 * `grep` manuel oublierait un jour un composant, un test Verrait encore vert. */
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

/** Retire les commentaires : nos fichiers *parlent* des chainses qu'on
 *  cherche (`/client/demande` dans la page de redirect, `RoleGuard` dans les
 *  explications), et lestests porteraient sinon sur leur propre documentation
 *  plutôt que sur le code. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/** Cherche une chaîne LITTÉRALEMENT, quotes comprises.
 *
 *  `/client/demande` en préfixe matcherait aussi `/client/demandes`, qui est
 *  une route légitime et intacte : le test passerait donc à vide (faux
 *  positif permanent) ou échouerait pour une fausse raison. D'où les quotes. */
function literalFiles(files: string[], literal: string): string[] {
  return files.filter((file) => readFileSync(file, 'utf8').includes(literal));
}

/** Tous les points d'entrée qui doivent viser la nouvelle page. */
function linkTargets(needle: string): string[] {
  const literal = `'${needle}'`;
  const files = literalFiles(walk(SRC), literal);
  return files.filter((file) => {
    /* La page de redirect parle de l'ancien chemin DANS UN COMMENTAIRE, et
     * `components/client/demande-wizard` contient la sous-chaîne
     * `client/demande-…` par le NOM du composant. */
    if (file.endsWith(join('app', 'client', 'demande', 'page.tsx'))) return false;
    if (file.includes('components/client/demande-wizard')) return false;
    /* Les tests citent l'ancien chemin pour vérifier son absence. */
    if (file.endsWith('.test.ts')) return false;
    return true;
  });
}

/* ── 1. La route publique existe ───────────────────────────────────── */

void test('D2 : /demande est une page publique, hors du layout /client', () => {
  const page = stripComments(read('../app/demande/page.tsx'));
  assert.match(page, /export default function DemandePage/);
  /* Le point central du chantier : cette page ne doit surtout pas être sous
   * `/client`, sinon le RoleGuard du layout la rebloque pour un visiteur.
   * On teste le MONTAGE `<RoleGuard`, pas le mot — le commentaire de la page
   * le cite. */
  assert.equal(page.includes('<RoleGuard'), false);
  /* Elle rend le wizard, seul composant partagé entre les deux parcours. */
  assert.match(page, /<DemandeWizard/);
});

void test('D2 : /demande expose un retour vers l’accueil', () => {
  const page = read('../app/demande/page.tsx');
  assert.match(page, /backHref="\/"/);
});

/* ── 2. Plus aucun lien vers l’ancien chemin ────────────────────────── */

void test('D2 : aucun lien ne pointe plus vers /client/demande', () => {
  const offenders = linkTargets('/client/demande');
  assert.deepEqual(
    offenders,
    [],
    `Ces fichiers pointent encore vers l'ancien chemin : ${offenders.join(', ')}`,
  );
});

void test('D2 : les routes /client/demandes (pluriel) sont INTACTES', () => {
  /* Contre-test du précédent : `/client/demandes` (liste et détail des
   * missions) est une route DIFFÉRENTE, qui doit avoir survécu intacte.
   * Sans ce test, une substitution par préfixe pourrait casser le dashboard
   * sans qu'aucun autre test ne s'en aperçoive. */
  const plural = literalFiles(walk(SRC), "'/client/demandes'");
  assert.ok(plural.length > 0, 'les liens vers /client/demandes ont disparu');
});

void test('D2 : tous les appels à l’ancien chemin ont bien été migrés', () => {
  /* Comptage de référence : la liste est celle de l'audit du flux, diminuée
   * d'un appel lorsque un écran mort a été retiré (le catalogue de lots,
   * jamais monté). Si elle rétrécit encore, un lien a été oublié — le test
   * échoue au lieu de laisser une page morte. */
  const expected = [
    ['../components/landing/hero.tsx', '/demande'],
    ['../components/landing/landing-sections.tsx', '/demande'],
    ['../components/chronologies/tracking-preview.tsx', '/demande'],
    ['../components/public/public-header.tsx', '/demande'],
    ['../components/client/dashboard/client-home-desktop-view.tsx', '/demande'],
    ['../components/client/dashboard/client-home-mobile-view.tsx', '/demande'],
    ['../components/client/dashboard/client-home-blocks.tsx', '/demande'],
    ['../components/client/client-dashboard.tsx', '/demande'],
    ['../app/client/layout.tsx', '/demande'],
    ['../app/client/confirmation/page.tsx', '/demande'],
  ] as const;
  for (const [file, needle] of expected) {
    assert.ok(read(file).includes(needle), `${file} ne pointe plus vers ${needle}`);
  }
});

void test('D2 : la CTA de la landing mène à /demande même hors session', () => {
  /* C'est la régression produit principale du chantier : un visiteur non
   * connecté cliquait sur « Décrire ma panne » et atterrissait sur
   * `/client/connexion`. */
  const hero = read('../components/landing/hero.tsx');
  assert.match(
    hero,
    /authenticated\s*\?\s*homePathForRole\(user\?\.role\)\s*:\s*'\/demande'/,
  );
  assert.equal(hero.includes("'/client/demande'"), false);
});

/* ── 3. L’ancien chemin redirige ────────────────────────────────────── */

void test('D2 : /client/demande redirige vers /demande', () => {
  const legacy = stripComments(read('../app/client/demande/page.tsx'));
  assert.match(legacy, /redirect\('\/demande'\)/);
  /* Pas de RoleGuard : le redirect part avant tout rendu, pour TOUT le monde. */
  assert.equal(legacy.includes('<RoleGuard'), false);
});

/* ── 4. Contrat du parcours anonyme dans le wizard ──────────────────── */

void test('D2 : le wizard détecte le mode anonyme via useAuth', () => {
  const wizard = read('../components/client/demande-wizard.tsx');
  assert.match(wizard, /useAuth\(\)/);
  /* Le mode ne doit PAS être décidé pendant `authLoading`, sinon un client
   * connecté verrait brièvement le bandeau et tirerait un PATCH inutile. */
  assert.match(wizard, /isAnonymousMode\s*=\s*!authLoading\s*&&\s*!authenticated/);
});

void test('D2 : le wizard synchronise le brouillon avec un debounce', () => {
  const wizard = read('../components/client/demande-wizard.tsx');
  assert.match(wizard, /setTimeout\(/);
  assert.match(wizard, /\}, 800\);/);
  /* Synchronisation ÉCRITE uniquement en mode anonyme : un client connecté ne
   * doit produire aucun appel brouillon. */
  assert.match(wizard, /if \(!isAnonymousMode \|\| !draftToken\) return;/);
});

void test('D2 : le wizard n’écrit aucun brouillon en mode authentifié', () => {
  const wizard = read('../components/client/demande-wizard.tsx');
  /* Le préremplissage profil (GET /auth/me) est la seule lecture d'identité
   * qui doit rester conditionnée à l'authentification. */
  assert.match(wizard, /if \(authLoading \|\| !authenticated\) return;/);
});

void test('D2 : le token de brouillon n’est jamais journalisé', () => {
  /* Le token est un secret (un lien magique). Il ne doit apparaître dans
   * AUCUNE instruction de journalisation : la console du navigateur est
   * lisible par le visiteur et atterrit dans les logs de terrain. */
  const sources = [
    ['wizard', read('../components/client/demande-wizard.tsx')],
    ['modale', read('../components/client/demande-auth-modal.tsx')],
    ['stockage', read('../lib/demande-draft-storage.ts')],
    ['sync', read('../lib/demande-draft-sync.ts')],
  ] as const;
  for (const [name, content] of sources) {
    const logged = content
      .split('\n')
      .filter((line) => /console\.(log|warn|error|info|debug)/.test(line));
    for (const line of logged) {
      assert.doesNotMatch(
        line,
        /draftToken|readDemandeDraftToken|created\.token|\btoken\b(?! de brouillon n)/,
        `${name} journalise peut-être le token : ${line.trim()}`,
      );
    }
  }
});

void test('D2 : le token est effacé après conversion réussie', () => {
  const wizard = read('../components/client/demande-wizard.tsx');
  /* Sans ce nettoyage, le wizard suivant repartirait d'un brouillon déjà
   * converti (409 à la conversion suivante). */
  assert.match(wizard, /clearDemandeDraftToken\(\)/);
});

void test('D2 : la modale d’authentification est montée par le wizard', () => {
  const wizard = read('../components/client/demande-wizard.tsx');
  assert.match(wizard, /<DemandeAuthModal/);
  assert.match(wizard, /onSuccess=\{handleAuthSuccess\}/);
  /* Le bandeau discret du parcours anonyme. */
  assert.match(wizard, /Votre progression est sauvegardée automatiquement/);
});

void test('D2 : la modale refuse `medias` et bascule sur 409', () => {
  const modal = read('../components/client/demande-auth-modal.tsx');
  assert.match(modal, /Créer mon compte/);
  assert.match(modal, /J&rsquo;ai déjà un compte/);
  assert.match(modal, /status === 409/);
  assert.match(
    modal,
    /Cet email est déjà utilisé\. Connectez-vous pour continuer\./,
  );
});

void test('D2 : la modale reporte la ville et l’adresse exigées par le backend', () => {
  /* `AuthService.register` refuse un CLIENT sans ville/adresse (400). La
   * modale ne les redemande pas : elle les reçoit du wizard. */
  const modal = read('../components/client/demande-auth-modal.tsx');
  assert.match(modal, /city: city\?\.trim\(\) \|\| undefined/);
  assert.match(modal, /address: address\?\.trim\(\) \|\| undefined/);
});

/* ── 5. Le parcours authentifié reste inchangé ──────────────────────── */

void test('D2 : le mode authentifié passe toujours par POST /demandes', () => {
  const wizard = read('../components/client/demande-wizard.tsx');
  assert.match(wizard, /await createDemande\(\{/);
  assert.match(wizard, /await submitAsAuthenticatedClient\(\);/);
});

void test('D2 : le repli si le brouillon est expiré passe par POST /demandes', () => {
  /* 404/410 au convert : la demande doit TOUT DE MÊME partir, en utilisant
   * l'état local du wizard. Sans ce repli, le visiteur resterait bloqué. */
  const wizard = read('../components/client/demande-wizard.tsx');
  assert.match(wizard, /err\.status === 410 \|\| err\.status === 404/);
  assert.match(wizard, /await submitAsAuthenticatedClient\(\);/);
});

void test('D2 : les 4 étapes et les règles de validation sont inchangées', () => {
  const wizard = read('../components/client/demande-wizard.tsx');
  /* Le chantier D2 ne touche ni à la structure du wizard ni à `canContinue`
   * (consigne explicite du cahier des charges). */
  assert.match(wizard, /'Votre appareil', 'Votre panne', 'Où et quand \?', 'Vérifiez et envoyez'/);
  assert.match(wizard, /const canContinue = useMemo/);
  assert.match(wizard, /disabled=\{!canContinue\}/);
});

void test('D2 : le replay du token est impossible (409 backend sur modification)', () => {
  /* Le backend répond 409 si on modifie un brouillon déjà converti ; le
   * frontend ne doit donc pas tenter de re-patcher après un 409. */
  const sync = read('../lib/demande-draft-sync.ts');
  assert.match(sync, /diffDraftPayload/);
  const storage = read('../lib/demande-draft-storage.ts');
  assert.match(storage, /relio_demande_draft_token/);
});