import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decideGuard } from './guard-decision.ts';

/* Chantier FIX — boucle infinie sur `/client/verification`.
 *
 * Exécuté avec Node 22+ natif (type stripping) : `decideGuard` est une fonction
 * pure, sans alias `@/` ni React — c'est tout l'intérêt de l'avoir extraite.
 *
 * Ces cas ont été écrits AVANT le correctif et échouaient : ils documentent
 * exactement la boucle, pas un comportement théorique. */

/* Les 3 chemins publics doivent être fournis : `publicPaths[0]` sert de
 * destination de repli dans le cas non authentifié. */
const CLIENT_PUBLIC = ['/client/connexion', '/client/inscription', '/client/verification'];
const TECH_PUBLIC = [
  '/technicien/connexion',
  '/technicien/inscription',
  '/technicien/verification',
];

const base = {
  loading: false,
  authenticated: true,
  role: 'CLIENT',
  emailVerified: false,
  expectedRole: 'CLIENT',
  publicPaths: CLIENT_PUBLIC,
} as const;

/* ── Le cœur du bug ─────────────────────────────────────────────────── */

void test('CLIENT non vérifié SUR sa page de vérification → show', () => {
  /* C'EST LA BOUCLE. Avant le correctif, ce cas renvoyait
   * `{ redirect, to: '/client' }` (à cause du test `isPublicPath`), et
   * `/client` rebascule ici par la règle « e-mail non vérifié » : le
   * navigateur oscillait entre les deux pages sans jamais afficher la
   * page de vérification. */
  const verdict = decideGuard({ ...base, pathname: '/client/verification' });
  assert.deepEqual(verdict, { action: 'show' });
});

void test('le cas précédent NE BOUCLE PAS : /client/verification n’est plus renvoyé vers /client', () => {
  /* Test de non-régression explicite : former la chaîne complète et vérifier
   * qu'elle converge au lieu d'osciller. */
  let path = '/client/demandes';
  const visited: string[] = [];
  for (let i = 0; i < 5; i += 1) {
    const verdict = decideGuard({ ...base, pathname: path });
    if (verdict.action !== 'redirect') {
      assert.equal(verdict.action, 'show');
      break;
    }
    visited.push(verdict.to);
    path = verdict.to;
  }
  /* Une seule transition, vers la page de vérification, puis on s'y arrête. */
  assert.deepEqual(visited, ['/client/verification']);
  assert.equal(path, '/client/verification');
});

void test('TECHNICIAN non vérifié SUR sa page de vérification → show (symétrie)', () => {
  /* Même boucle, même cause, côté technicien. */
  const verdict = decideGuard({
    loading: false,
    authenticated: true,
    role: 'TECHNICIAN',
    emailVerified: false,
    expectedRole: 'TECHNICIAN',
    pathname: '/technicien/verification',
    publicPaths: TECH_PUBLIC,
  });
  assert.deepEqual(verdict, { action: 'show' });
});

/* ── Robustesse à la query string ──────────────────────────────────── */

void test('query string ignorée : /client/verification?from=demande → show', () => {
  /* `usePathname()` strippe normalement la query, mais on ne doit pas
   * sur-vivre à cette garantie : une égalité stricte ferait échouer le test
   * ci-dessus et l'utilisateur serait renvoyé sur lui-même. */
  const verdict = decideGuard({
    ...base,
    pathname: '/client/verification?from=demande&email=a@b.c',
  });
  assert.deepEqual(verdict, { action: 'show' });
});

/* ── Comportements qui doivent être PRÉSERVÉS ──────────────────────── */

void test('CLIENT non vérifié sur /client/demandes → redirect vers /client/verification', () => {
  const verdict = decideGuard({ ...base, pathname: '/client/demandes' });
  assert.deepEqual(verdict, { action: 'redirect', to: '/client/verification' });
});

void test('CLIENT non vérifié sur /client → redirect vers /client/verification', () => {
  const verdict = decideGuard({ ...base, pathname: '/client' });
  assert.deepEqual(verdict, { action: 'redirect', to: '/client/verification' });
});

void test('CLIENT VÉRIFIÉ sur /client/verification → toujours redirigé vers /client', () => {
  /* Une fois vérifié, la page de vérification n'a plus rien à faire : elle
   * doit le renvoyer vers son espace. Ce comportement est PRÉSERVÉ par le
   * correctif — c'est le cas non vérifié qui a changé. */
  const verdict = decideGuard({
    ...base,
    emailVerified: true,
    pathname: '/client/verification',
  });
  assert.deepEqual(verdict, { action: 'redirect', to: '/client' });
});

void test('CLIENT non vérifié sur /client/inscription → redirect vers la vérification', () => {
  /* Un utilisateur déjà inscrit ne peut pas se ré-inscrire : la règle
   * « e-mail non vérifié » prime sur le caractère public de la page. */
  const verdict = decideGuard({ ...base, pathname: '/client/inscription' });
  assert.deepEqual(verdict, { action: 'redirect', to: '/client/verification' });
});

void test('rôle inattendu → redirigé vers son habitat (inchangé)', () => {
  const verdict = decideGuard({
    ...base,
    role: 'ADMIN',
    emailVerified: true,
    pathname: '/client/demandes',
  });
  assert.deepEqual(verdict, { action: 'redirect', to: '/admin' });
});

void test('CLIENT vérifié sur une page protégée → show', () => {
  const verdict = decideGuard({
    ...base,
    emailVerified: true,
    pathname: '/client/demandes',
  });
  assert.deepEqual(verdict, { action: 'show' });
});

void test('anonyme sur une page publique → show (inchangé)', () => {
  const verdict = decideGuard({
    ...base,
    authenticated: false,
    emailVerified: false,
    pathname: '/client/inscription',
  });
  assert.deepEqual(verdict, { action: 'show' });
});

void test('anonyme sur une page protégée → login avec ?redirect= (inchangé)', () => {
  const verdict = decideGuard({
    ...base,
    authenticated: false,
    emailVerified: false,
    pathname: '/client/demandes',
  });
  assert.deepEqual(verdict, {
    action: 'redirect',
    to: `/client/connexion?redirect=${encodeURIComponent('/client/demandes')}`,
  });
});

void test('loading → écran neutre, aucune redirection', () => {
  const verdict = decideGuard({ ...base, loading: true, pathname: '/client/verification' });
  assert.deepEqual(verdict, { action: 'loading' });
});

/* ── Le beforeunload du wizard ─────────────────────────────────────── */

void test('le wizard retire le beforeunload pendant la conversion', () => {
  const wizard = readFileSync(
    new URL('../components/client/demande-wizard.tsx', import.meta.url),
    'utf8',
  );
  /* `isSubmitting` seul ne suffit plus : depuis D2.5 le parcours anonyme
   * passe par `runDraftConversion`, qui pilote `converting` et laisse
   * `isSubmitting` à `false`. Sans ce second garde, le dialogue natif
   * « Quitter la page ? » interrompait la redirection finale. */
  assert.match(wizard, /if \(!hasStarted \|\| isSubmitting \|\| converting\) return;/);
  assert.match(wizard, /\}, \[hasStarted, isSubmitting, converting\]\);/);
});

void test('le wizard arme bien le listener hors conversion (non-régression)', () => {
  const wizard = readFileSync(
    new URL('../components/client/demande-wizard.tsx', import.meta.url),
    'utf8',
  );
  assert.match(wizard, /window\.addEventListener\('beforeunload', handler\)/);
  assert.match(wizard, /return \(\) => window\.removeEventListener\('beforeunload', handler\)/);
});

/* ── Le panneau de vérification ────────────────────────────────────── */

void test('le panneau attend emailVerified avant de rediriger', () => {
  const panel = readFileSync(
    new URL('../components/auth/verification-panel.tsx', import.meta.url),
    'utf8',
  );
  const effect = panel.slice(panel.indexOf('if (!verified || !fromDemande) return;'));
  assert.match(effect.slice(0, 400), /if \(!user\?\.emailVerified\) return;/);
  assert.match(effect.slice(0, 400), /router\.replace\('\/client\/demandes'\)/);
});

void test('le panneau NE force PAS la redirection (une boucle se recréerait)', () => {
  const panel = readFileSync(
    new URL('../components/auth/verification-panel.tsx', import.meta.url),
    'utf8',
  );
  /* Un « timeout de sécurité » qui pousserait vers `/client/demandes` malgré
   * un `emailVerified` non synchronisé renverrait l'utilisateur à
   * `/client/verification` — la boucle qu'on vient de corriger. Le filet doit
   * RÉACTUALISER l'état, pas forcer la navigation. */
  assert.doesNotMatch(panel, /setTimeout[\s\S]{0,400}router\.(push|replace)\('\/client\/demandes'\)/);
  assert.match(panel, /void refresh\(\);/);
});