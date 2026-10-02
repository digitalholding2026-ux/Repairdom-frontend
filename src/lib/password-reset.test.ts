/* Reset password + middleware anti-flash :
 *   node --test src/lib/password-reset.test.ts
 * ou : npm run test:unit
 * - règles de robustesse (8+, majuscule, minuscule, chiffre) + jauge ;
 * - redirection middleware (présence cookie, publiques exclues, ?redirect=) ;
 * - pages top-level + liens + contrats API + RoleGuard conservé.
 * Imports `.ts` explicites exigés par Node (fichier exclu du typecheck Next,
 * voir tsconfig `exclude`).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  isPasswordStrong,
  passwordRules,
  passwordStrength,
} from './password-strength.ts';
import { authRedirectFor } from './route-protection.ts';

const read = (rel: string): string =>
  readFileSync(new URL(rel, import.meta.url), 'utf8');

void test('mot de passe : règles 8+/majuscule/minuscule/chiffre', () => {
  const weak = passwordRules('faible');
  assert.equal(weak.find((r) => r.id === 'length')?.satisfied, false);
  const noUpper = passwordRules('sansmajuscule1');
  assert.equal(noUpper.find((r) => r.id === 'uppercase')?.satisfied, false);
  const noDigit = passwordRules('SansChiffre');
  assert.equal(noDigit.find((r) => r.id === 'digit')?.satisfied, false);
  const strong = passwordRules('Fort1234');
  assert.ok(strong.every((r) => r.satisfied));
  assert.equal(isPasswordStrong('Fort1234'), true);
  assert.equal(isPasswordStrong('faible'), false);
});

void test('mot de passe : jauge faible / moyen / fort', () => {
  assert.equal(passwordStrength('abc'), 'faible');
  assert.equal(passwordStrength('Fort1234'), 'moyen');
  assert.equal(passwordStrength('Fort1234LongMotDePasse'), 'fort');
});

void test('middleware : sans cookie sur /client → redirect vers connexion', () => {
  assert.equal(
    authRedirectFor('/client', '', false),
    '/client/connexion?redirect=%2Fclient',
  );
  assert.equal(
    authRedirectFor('/client/demandes', '', false),
    '/client/connexion?redirect=%2Fclient%2Fdemandes',
  );
});

void test('middleware : routes publiques laissées passer', () => {
  assert.equal(authRedirectFor('/client/connexion', '', false), null);
  assert.equal(authRedirectFor('/client/inscription', '', false), null);
  assert.equal(authRedirectFor('/client/verification', '', false), null);
  assert.equal(authRedirectFor('/technicien/connexion', '', false), null);
  assert.equal(authRedirectFor('/technicien/inscription', '', false), null);
  assert.equal(authRedirectFor('/technicien/verification', '', false), null);
});

void test('middleware : cookie présent → passe, ?redirect= conservé', () => {
  assert.equal(authRedirectFor('/client', '', true), null);
  assert.equal(authRedirectFor('/admin', '', true), null);
  assert.equal(
    authRedirectFor('/technicien/demandes', '?page=2', false),
    '/technicien/connexion?redirect=%2Ftechnicien%2Fdemandes%3Fpage%3D2',
  );
  assert.equal(authRedirectFor('/admin', '', false), '/?redirect=%2Fadmin');
  assert.equal(authRedirectFor('/', '', false), null);
  assert.equal(authRedirectFor('/suivi', '', false), null);
});

void test('pages reset : top-level, contenus exigés', () => {
  const forgot = read('../app/mot-de-passe-oublie/page.tsx');
  assert.match(forgot, /Mot de passe oublié \?/);
  assert.match(forgot, /nous vous enverrons un lien de/);
  assert.match(forgot, /Retour à la connexion/);
  const form = read('../components/auth/forgot-password-form.tsx');
  assert.match(form, /Envoyer le lien/);
  assert.match(form, /Si un compte existe avec cet e-mail/);
  const reset = read('../app/reinitialiser-mot-de-passe/page.tsx');
  assert.match(reset, /Réinitialiser/);
  const resetForm = read('../components/auth/reset-password-form.tsx');
  assert.match(resetForm, /Ce lien a expiré ou est invalide/);
  assert.match(resetForm, /Force du mot de passe/);
  assert.match(resetForm, /Réinitialiser mon mot de passe/);
  assert.match(resetForm, /validateResetToken/);
});

void test('liens mot de passe oublié sur les 2 pages de connexion', () => {
  const client = read('../components/client/client-auth-form.tsx');
  assert.match(client, /Mot de passe oublié \?/);
  assert.match(client, /\/mot-de-passe-oublie/);
  // Après login, ?redirect= est rejoué (sinon retour dashboard du rôle).
  assert.match(client, /safeRedirect\(window\.location\.search, '\/client'/);
  const tech = read('../components/technician/technician-auth-form.tsx');
  assert.match(tech, /Mot de passe oublié \?/);
  assert.match(tech, /\/mot-de-passe-oublie/);
  assert.match(tech, /safeRedirect\(window\.location\.search, '\/technicien'/);
});

void test('middleware + contrats API + RoleGuard conservé', () => {
  const mw = read('../middleware.ts');
  assert.match(mw, /AUTH_COOKIE_NAME/);
  assert.match(mw, /authRedirectFor/);
  assert.match(mw, /\/client\/:path\*/);
  assert.match(mw, /\/technicien\/:path\*/);
  assert.match(mw, /\/admin\/:path\*/);
  assert.match(mw, /307/);
  assert.doesNotMatch(mw, /verify\(|jwt\.verify|jsonwebtoken/);
  assert.match(read('./route-protection.ts'), /repairdom_token/);
  const api = read('./api/auth-service.ts');
  assert.match(api, /requestPasswordReset/);
  assert.match(api, /resetPassword/);
  assert.match(api, /validateResetToken/);
  assert.match(api, /forgot-password/);
  assert.match(api, /reset-password/);
  const layouts = [
    read('../app/client/layout.tsx'),
    read('../app/technicien/layout.tsx'),
    read('../app/admin/layout.tsx'),
  ];
  for (const layout of layouts) {
    assert.match(layout, /RoleGuard/);
  }
});
