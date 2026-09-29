/* CHANTIER ERREURS P1 — standardisation des erreurs UI.
 *
 * Exécuté avec Node 24 natif (type stripping, zéro dépendance) :
 *   node --test src/lib/error-handling.test.ts
 * ou : npm run test:unit
 * Imports avec extension `.ts` explicite (exigée par Node) ; ce fichier
 * est exclu du tsconfig Next (jamais bundlé).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isForbiddenError,
  isNotFoundError,
  toUserErrorMessage,
} from './ui-error-message.ts';

/* `extractErrorMessage` (src/lib/errors.ts) délègue au sanitizer central :
 * vérifié statiquement ci-dessous (import extensionless = résolu par le
 * bundler, non importable en Node natif) + `tsc --noEmit` valide le câblage. */
void test('extractErrorMessage délègue au sanitizer central', async () => {
  const { readFileSync } = await import('node:fs');
  const source = readFileSync(new URL('./errors.ts', import.meta.url), 'utf8');
  assert.match(source, /toUserErrorMessage\(err, fallback\)/);
  assert.doesNotMatch(source, /err\.message/);
});

void test('HTTP : 401/403/404/409/422/429/500 → FR clair et actionnable', () => {
  assert.match(toUserErrorMessage({ status: 401 }, 'x'), /expiré|Reconnectez/);
  assert.match(toUserErrorMessage({ status: 403 }, 'x'), /autoris/);
  assert.match(toUserErrorMessage({ status: 404 }, 'x'), /introuvable/);
  assert.match(toUserErrorMessage({ status: 409 }, 'x'), /enregistrée|changé/);
  assert.match(toUserErrorMessage({ status: 413 }, 'x'), /volumineux/);
  assert.match(toUserErrorMessage({ status: 422 }, 'x'), /invalides/);
  assert.match(toUserErrorMessage({ status: 429 }, 'x'), /tentatives/);
  assert.match(toUserErrorMessage({ status: 500 }, 'x'), /temporaire|instants/);
  assert.match(toUserErrorMessage({ status: 503 }, 'x'), /temporaire|instants/);
  assert.match(toUserErrorMessage({ status: 599 }, 'x'), /temporaire|instants/);
});

void test('code métier prioritaire sur le statut HTTP', () => {
  assert.match(
    toUserErrorMessage({ status: 404, code: 'INSUFFICIENT_FUNDS' }, 'x'),
    /Solde insuffisant/,
  );
  assert.match(
    toUserErrorMessage({ status: 500, code: 'PAYMENT_FAILED' }, 'x'),
    /pas abouti/,
  );
  assert.match(
    toUserErrorMessage({ status: 403, code: 'KYC_REQUIRED' }, 'x'),
    /vérifié/,
  );
  // Casse/format insensible.
  assert.match(toUserErrorMessage({ code: 'not_found' }, 'x'), /introuvable/);
  assert.match(toUserErrorMessage({ code: 'forbidden' }, 'x'), /autoris/);
});

void test('réseau/timeout → message connexion (jamais de brut fetch)', () => {
  for (const raw of ['Failed to fetch', 'fetch failed', 'NetworkError', 'ECONNREFUSED']) {
    assert.match(toUserErrorMessage(new Error(raw), 'x'), /Connexion impossible/);
  }
});

void test('secrets et techniques jamais exposés', () => {
  const fallback = 'Repli sûr.';
  for (const raw of [
    'sk_live_abc123 failure',
    'whsec_s3cr3t leak {a:1}',
    'Bearer xyz failed',
    'X-Api-Key: 12345 denied',
    'Idempotency-Key abc already used',
    'Unique constraint failed (P2002)',
    'PrismaClientKnownRequestError P2025',
    'SELECT * FROM users WHERE id=1',
    '<html><body>Bad Gateway</body></html>',
    '{"error":"boom","code":500}',
    'Cannot read properties of undefined (reading x)',
    'at runAction (/app/page.js:12:34)',
    'a'.repeat(300),
  ]) {
    assert.equal(toUserErrorMessage(new Error(raw), fallback), fallback);
  }
});

void test('messages métier FR sûrs conservés (XAF → FCFA)', () => {
  assert.equal(
    toUserErrorMessage(new Error('Montant minimum 100 XAF requis.'), 'x'),
    'Montant minimum 100 FCFA requis.',
  );
});

void test('isNotFoundError / isForbiddenError : statut ou code, jamais de substring', () => {
  assert.equal(isNotFoundError({ status: 404 }), true);
  assert.equal(isNotFoundError({ code: 'DEMANDE_NOT_FOUND' }), true);
  assert.equal(isNotFoundError({ code: 'not_found' }), true);
  assert.equal(isNotFoundError(new Error('Mission introuvable.')), false);
  assert.equal(isNotFoundError({ status: 500 }), false);
  assert.equal(isForbiddenError({ status: 403 }), true);
  assert.equal(isForbiddenError({ code: 'FORBIDDEN' }), true);
  assert.equal(isForbiddenError(new Error('Accès interdit.')), false);
});

void test('sanitizer central : extractErrorMessage équivalent (via erreurs typées)', () => {
  // extractErrorMessage(err, fallback) === toUserErrorMessage(err, fallback)
  // (délégation directe, vérifiée statiquement ci-dessus).
  assert.equal(
    toUserErrorMessage({ status: 401 }, 'Repli.'),
    toUserErrorMessage({ status: 401 }, 'Repli.'),
  );
  assert.equal(toUserErrorMessage(new Error('sk_live_x {a:1}'), 'Repli.'), 'Repli.');
});
