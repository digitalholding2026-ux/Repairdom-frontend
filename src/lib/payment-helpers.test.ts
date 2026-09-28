/* CHANTIER PAIEMENT P0/P1 — tests unitaires des helpers purs paiement.
 *
 * Exécuté avec Node 24 natif (type stripping, zéro dépendance) :
 *   node --test src/lib/payment-helpers.test.ts
 * ou : npm run test:unit
 * Imports avec extension `.ts` explicite (exigée par Node) ; ce fichier
 * est exclu du tsconfig Next (jamais bundlé). Aucune opération réelle. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCmPhone, isValidCmPhone } from './phone.ts';
import {
  MAX_FINANCE_AMOUNT,
  MIN_FINANCE_AMOUNT,
  validateFinanceAmount,
} from './finance-limits.ts';
import { createIdempotencyKey } from './idempotency-key.ts';
import { toUserErrorMessage } from './ui-error-message.ts';
import { feeChargeModeNote } from './withdrawal-fees.ts';

void test('téléphone : 690000000 / 237… / +237… convergent (jamais de doublon)', () => {
  for (const raw of ['690000000', '237690000000', '+237690000000', '+237 690 00 00 00']) {
    assert.equal(normalizeCmPhone(raw), '+237690000000');
  }
  const once = normalizeCmPhone('690000000');
  assert.equal(normalizeCmPhone(once), '+237690000000');
});

void test('téléphone : numéro invalide → null', () => {
  for (const raw of ['abc', '12', '12345678', '1234567890123456', '', '   ', '+237 69A 00 00 00']) {
    assert.equal(normalizeCmPhone(raw), null);
  }
  assert.equal(normalizeCmPhone(null), null);
  assert.equal(normalizeCmPhone(undefined), null);
  assert.equal(normalizeCmPhone(690000000), null);
  assert.equal(isValidCmPhone('690000000'), true);
  assert.equal(isValidCmPhone('abc'), false);
});

void test('montants : 50/99/100/10M/10M+1 (recharge + retrait)', () => {
  assert.equal(MIN_FINANCE_AMOUNT, 100);
  assert.equal(MAX_FINANCE_AMOUNT, 10_000_000);
  for (const kind of ['recharge', 'retrait'] as const) {
    assert.match(validateFinanceAmount(50, kind) ?? '', /minimum 100/);
    assert.match(validateFinanceAmount(99, kind) ?? '', /minimum 100/);
    assert.equal(validateFinanceAmount(100, kind), null);
    assert.equal(validateFinanceAmount(10_000_000, kind), null);
    assert.match(validateFinanceAmount(10_000_001, kind) ?? '', /maximum/);
    assert.match(validateFinanceAmount(99_999_999, kind) ?? '', /maximum/);
    assert.match(validateFinanceAmount(Number.NaN, kind) ?? '', /entier/);
    assert.match(validateFinanceAmount(12.5, kind) ?? '', /entier/);
  }
});

void test('idempotence : clés uniques, stables en format, ≤ 100 caractères', () => {
  const keys = new Set(Array.from({ length: 100 }, () => createIdempotencyKey()));
  assert.equal(keys.size, 100);
  for (const key of keys) {
    assert.ok(key.length > 0 && key.length <= 100);
  }
});

void test('idempotence : repli sans crypto.randomUUID (contexte non-secure)', () => {
  const original = (globalThis as { crypto?: unknown }).crypto;
  try {
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
    const key = createIdempotencyKey();
    assert.ok(key.length > 0 && key.length <= 100);
    assert.match(key, /^[0-9a-f-]+$/);
  } finally {
    Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true });
  }
});

void test('erreurs métier : CANCELLED / 409 / idempotency_conflict → FR clair', () => {
  assert.match(toUserErrorMessage({ code: 'CANCELLED' }, 'x'), /annul/);
  assert.match(toUserErrorMessage({ code: 'CONFLICT' }, 'x'), /déjà été enregistrée/);
  assert.match(toUserErrorMessage({ status: 409 }, 'x'), /déjà été enregistrée/);
  assert.match(toUserErrorMessage({ code: 'idempotency_conflict' }, 'x'), /déjà été enregistrée/);
  assert.match(toUserErrorMessage({ code: 'INSUFFICIENT_FUNDS' }, 'x'), /Solde insuffisant/);
  assert.match(toUserErrorMessage({ code: 'WITHDRAWAL_FAILED' }, 'x'), /retrait.*pas abouti/i);
  assert.match(toUserErrorMessage({ code: 'WITHDRAWAL_REFUSED' }, 'x'), /retrait.*refusé/i);
  assert.match(toUserErrorMessage({ code: 'PAYMENT_FAILED' }, 'x'), /paiement.*pas abouti/i);
  assert.match(toUserErrorMessage({ code: 'PAYMENT_REFUSED' }, 'x'), /paiement.*refusé/i);
  assert.match(toUserErrorMessage({ code: 'PAYMENT_CANCELLED' }, 'x'), /annul/);
});

void test('erreurs : secrets et structures techniques jamais exposés', () => {
  assert.equal(
    toUserErrorMessage(new Error('sk_live_abc123 failure {code:1}'), 'Repli sûr.'),
    'Repli sûr.',
  );
  assert.equal(
    toUserErrorMessage(new Error('Bearer xyz failed'), 'Repli sûr.'),
    'Repli sûr.',
  );
});

void test('frais : ADD_ON / DEDUCTED expliqués, inconnu → null (jamais hardcodé)', () => {
  assert.equal(feeChargeModeNote('ADD_ON'), 'Frais ajoutés au montant débité.');
  assert.equal(
    feeChargeModeNote('DEDUCTED'),
    'Frais déduits du montant reçu par le bénéficiaire.',
  );
  assert.equal(feeChargeModeNote(null), null);
  assert.equal(feeChargeModeNote(undefined), null);
  assert.equal(feeChargeModeNote('UNKNOWN_MODE'), null);
});
