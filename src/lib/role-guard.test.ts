/* RoleGuard (décision pure) + safeRedirect :
 *   node --test src/lib/role-guard.test.ts
 * ou : npm run test:unit
 * - loading → écran de chargement, jamais de redirection ;
 * - non authentifié → /connexion?redirect=<path> ;
 * - rôle correct → contenu ; rôle incorrect → homePath du rôle ;
 * - safeRedirect : interne acceptée, externe et //-préfixée rejetées.
 * Imports `.ts` explicites exigés par Node (fichier exclu du typecheck Next,
 * voir tsconfig `exclude`).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decideGuard } from './guard-decision.ts';

const read = (rel: string): string =>
  readFileSync(new URL(rel, import.meta.url), 'utf8');

const CLIENT_PUBLIC = ['/client/connexion', '/client/inscription', '/client/verification'];

void test('RoleGuard : loading → écran de chargement, pas de redirection', () => {
  assert.deepEqual(
    decideGuard({
      loading: true,
      authenticated: false,
      role: undefined,
      emailVerified: undefined,
      expectedRole: 'CLIENT',
      pathname: '/client',
      publicPaths: CLIENT_PUBLIC,
    }),
    { action: 'loading' },
  );
  assert.deepEqual(
    decideGuard({
      loading: true,
      authenticated: true,
      role: 'CLIENT',
      emailVerified: true,
      expectedRole: 'CLIENT',
      pathname: '/client',
      publicPaths: CLIENT_PUBLIC,
    }),
    { action: 'loading' },
  );
});

void test('RoleGuard : non authentifié → /connexion?redirect=<path>', () => {
  assert.deepEqual(
    decideGuard({
      loading: false,
      authenticated: false,
      role: undefined,
      emailVerified: undefined,
      expectedRole: 'CLIENT',
      pathname: '/client',
      publicPaths: CLIENT_PUBLIC,
    }),
    { action: 'redirect', to: '/client/connexion?redirect=%2Fclient' },
  );
});

void test('RoleGuard : rôle correct → contenu', () => {
  assert.deepEqual(
    decideGuard({
      loading: false,
      authenticated: true,
      role: 'CLIENT',
      emailVerified: true,
      expectedRole: 'CLIENT',
      pathname: '/client/demandes',
      publicPaths: CLIENT_PUBLIC,
    }),
    { action: 'show' },
  );
});

void test('RoleGuard : rôle incorrect → homePath du rôle', () => {
  assert.deepEqual(
    decideGuard({
      loading: false,
      authenticated: true,
      role: 'ADMIN',
      emailVerified: true,
      expectedRole: 'CLIENT',
      pathname: '/client',
      publicPaths: CLIENT_PUBLIC,
    }),
    { action: 'redirect', to: '/admin' },
  );
});

void test('LoadingScreen : JSON importé, passé au lecteur unique, neutre', () => {
  const wrappers = read('../components/lottie/lottie-animations.tsx');
  assert.match(wrappers, /connexion-animation\.json/);
  assert.match(wrappers, /ConnexionAnimation/);
  assert.match(wrappers, /LottieAnimation/);
  const screen = read('../components/auth/loading-screen.tsx');
  assert.match(screen, /ConnexionAnimation/);
  assert.match(screen, /min-h-dvh/);
  assert.match(screen, /bg-background/);
  assert.doesNotMatch(screen, /<button|<a href|Chargement/);
  const guard = read('../components/auth/role-guard.tsx');
  assert.match(guard, /LoadingScreen/);
});

void test('safeRedirect : interne acceptée, externe et // rejetées (statique)', () => {
  // Node natif) : vérification statique du contrat — préfixe exigé, `//`
  // et backslash rejetés, fallback rôle.
  const src = read('./api/auth-service.ts');
  assert.match(src, /export function safeRedirect/);
  assert.match(src, /target\.startsWith\(allowedPrefix\)/);
  assert.match(src, /!target\.startsWith\('\/\/'\)/);
  assert.match(src, /!target\.includes\('\\\\'\)/);
  // Miroir local aligné sur la source canonique `homePathForRole`.
  const guard = read('./guard-decision.ts');
  assert.match(guard, /TECHNICIAN.*\/technicien/);
  assert.match(guard, /ADMIN.*\/admin/);
  assert.match(guard, /return '\/client'/);
  assert.match(src, /TECHNICIAN.*\/technicien/);
  assert.match(src, /ADMIN.*\/admin/);
});
