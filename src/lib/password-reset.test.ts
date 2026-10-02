/* Reset password (sans middleware — supprimé, inadapté au cross-domain) :
 *   node --test src/lib/password-reset.test.ts
 * ou : npm run test:unit
 * - règles de robustesse (8+, majuscule, minuscule, chiffre) + jauge ;
 * - pages top-level + liens + contrats API + RoleGuard conservé ;
 * - `?redirect=` rejoué après login (safeRedirect, indépendant).
 * Imports `.ts` explicites exigés par Node (fichier exclu du typecheck Next,
 * voir tsconfig `exclude`).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  isPasswordStrong,
  passwordRules,
  passwordStrength,
} from './password-strength.ts';

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
  assert.match(client, /safeRedirect\(window\.location\.search, '\/client'/);
  const tech = read('../components/technician/technician-auth-form.tsx');
  assert.match(tech, /Mot de passe oublié \?/);
  assert.match(tech, /\/mot-de-passe-oublie/);
  assert.match(tech, /safeRedirect\(window\.location\.search, '\/technicien'/);
});

void test('contrats API reset + RoleGuard conservé (sans middleware)', () => {
  assert.equal(existsSync(new URL('../middleware.ts', import.meta.url)), false);
  assert.equal(existsSync(new URL('./route-protection.ts', import.meta.url)), false);
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
  const guard = read('../components/auth/role-guard.tsx');
  assert.match(guard, /decideGuard/);
  assert.match(guard, /LoadingScreen/);
});
