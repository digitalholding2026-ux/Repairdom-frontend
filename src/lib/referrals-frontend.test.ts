/* Chantier 4B — PARRAINAGE CLIENT (côté frontend).
 *
 * Ces tests verrouillent trois choses distinctes :
 *
 *   1. le DOUBLON de barème avec le backend — deux implémentations, une
 *      seule source de vérité. La divergence doit se voir dans la suite,
 *      pas dans un test manuel ;
 *   2. la page « mes parrainages » : elle n'invente plus un code local, elle
 *      affiche celui du serveur et gère ses trois états (chargement, erreur,
 *      liste vide) ;
 *   3. le parcours d'inscription : le code est facultatif, pré-rempli depuis
 *      `?ref=`, et ne bloque JAMAIS la soumission.
 *
 * Vérification statique pour les composants (ce dépôt n'a ni jsdom ni
 * testing-library) ; vérification fonctionnelle pour les helpers purs.
 *
 * RÈGLE FCFA : les montants sont des ENTIERS XAF ; le formatage est fait par
 * `formatFCFA`, jamais ici.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  REFERRAL_CODE_ALPHABET,
  REFERRAL_CODE_PREFIX,
  REFERRAL_MAX_REFERRALS,
  REFERRAL_REWARD_XAF,
  REFERRAL_STATUS_LABEL,
  REFERRAL_WELCOME_XAF,
  isReferralExpired,
  isValidReferralCode,
  referralCodeError,
  referralCodeFromSearch,
  type ReferralStatus,
} from './referrals-rules.ts';
import { formatFCFA } from './format-fcfa.ts';

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');
const APP_ROOT = join(import.meta.dirname, '..', '..');
const readApp = (rel: string): string => readFileSync(join(APP_ROOT, rel), 'utf8');

const BACKEND_CONFIG = join(APP_ROOT, '..', 'backend', 'src', 'referrals', 'referrals.config.ts');

/* ── Barème : le doublon frontend/backend doit rester aligné ──────────── */

test('4B — barème frontend identique au barème backend', () => {
  const backend = readFileSync(BACKEND_CONFIG, 'utf8');
  assert.match(backend, /REFERRAL_REWARD_XAF = 500/, 'le barème backend a changé');
  assert.match(backend, /REFERRAL_WELCOME_XAF = 500/);
  assert.match(backend, /REFERRAL_MAX_REFERRALS = 5/);
  assert.equal(REFERRAL_REWARD_XAF, 500);
  assert.equal(REFERRAL_WELCOME_XAF, 500);
  assert.equal(REFERRAL_MAX_REFERRALS, 5);
});

test('4B — alphabet de code identique au backend', () => {
  const backend = readFileSync(BACKEND_CONFIG, 'utf8');
  const match = backend.match(/REFERRAL_CODE_ALPHABET\s*=\s*\n?\s*'([^']+)'/);
  assert.ok(match, 'alphabet backend introuvable — la dénomination a peut-être changé');
  assert.equal(match[1], REFERRAL_CODE_ALPHABET);
  assert.match(backend, /REFERRAL_CODE_PREFIX = 'RELIO-'/);
  assert.equal(REFERRAL_CODE_PREFIX, 'RELIO-');
});

/* ── Validation du code ───────────────────────────────────────────────── */

test('4B — le code valide suit le format RELIO-XXXXX', () => {
  assert.equal(isValidReferralCode('RELIO-ABCDE'), true);
  assert.equal(isValidReferralCode('relio-abcde'), true);
  assert.equal(isValidReferralCode('  RELIO-ABCDE  '), true);
  // Les 5 caractères exclus sont les confusions de dictée : 0, 1, I, L, O.
  for (const bad of ['RELIO-AB0DE', 'RELIO-AB1DE', 'RELIO-ABIDE', 'RELIO-ABLDE', 'RELIO-ABODE']) {
    assert.equal(isValidReferralCode(bad), false, `${bad} ne devrait pas être accepté`);
  }
  assert.equal(isValidReferralCode('RELIO-ABCD'), false); // trop court
  assert.equal(isValidReferralCode('RELIO-ABCDEF'), false); // trop long
  assert.equal(isValidReferralCode('XXXXX-ABCDE'), false);
  assert.equal(isValidReferralCode(''), false);
  assert.equal(isValidReferralCode(null), false);
  assert.equal(isValidReferralCode(undefined), false);
});

test('4B — un code ABSENT ou mal saisi ne bloque pas l’inscription', () => {
  // Vide = rien à signaler : le champ est facultatif, une erreur sur un champ
  // que l'utilisateur n'a pas rempli serait du bruit.
  assert.equal(referralCodeError(''), null);
  assert.equal(referralCodeError('   '), null);
  assert.equal(referralCodeError('RELIO-ABCDE'), null);
  // Mal formé = un mot seulement, lisible, et la saisie reste possible.
  assert.match(String(referralCodeError('Bidon')), /invalide/i);
  assert.match(String(referralCodeError('RELIO-AB0DE')), /invalide/i);
});

test('4B — lecture du code dans ?ref=', () => {
  assert.equal(referralCodeFromSearch('?ref=RELIO-ABCDE'), 'RELIO-ABCDE');
  assert.equal(referralCodeFromSearch('?ref=relio-abcde'), 'RELIO-ABCDE');
  assert.equal(referralCodeFromSearch('?utm=x&ref=RELIO-ABCDE&y=1'), 'RELIO-ABCDE');
  assert.equal(referralCodeFromSearch(''), null);
  assert.equal(referralCodeFromSearch('?autre=1'), null);
  assert.equal(referralCodeFromSearch('?ref='), null);
});

/* ── Statuts ──────────────────────────────────────────────────────────── */

test('4B — chaque statut a un libellé et un cas non récompensé', () => {
  const statuses: ReferralStatus[] = ['PENDING', 'REGISTERED', 'REWARDED', 'EXPIRED'];
  for (const status of statuses) {
    assert.ok(REFERRAL_STATUS_LABEL[status], `libellé manquant pour ${status}`);
  }
  assert.equal(isReferralExpired('EXPIRED'), true);
  assert.equal(isReferralExpired('REWARDED'), false);
  assert.equal(isReferralExpired('REGISTERED'), false);
  assert.equal(isReferralExpired('PENDING'), false);
});

/* ── Règle FCFA ──────────────────────────────────────────────────────── */

test('4B — les montants du parrainage sont formatés en FCFA', () => {
  const NBSP = String.fromCharCode(160); // insécable, comme formatFCFA
  assert.equal(formatFCFA(REFERRAL_REWARD_XAF), '500 FCFA');
  assert.equal(formatFCFA(REFERRAL_WELCOME_XAF), '500 FCFA');
  assert.equal(formatFCFA(3 * REFERRAL_REWARD_XAF), `1${NBSP}500 FCFA`);
});

/* ── Page « mes parrainages » ─────────────────────────────────────────── */

test('4B — la page affiche code, lien, progression et liste', () => {
  const page = readApp('src/app/client/parrainage/page.tsx');

  // Le code vient du BACKEND, il n'est plus fabriqué côté client.
  assert.match(page, /getMyReferrals\(\)/);
  assert.doesNotMatch(page, /buildReferralCode/);
  assert.doesNotMatch(page, /user\.id\.slice/);

  // Code + lien de partage, tous deux IssueS de la réponse serveur : le
  // lien est construit par le backend (seul à connaître le préfixe).
  assert.match(page, /data\.code/);
  assert.match(page, /data\.shareUrl/);
  assert.doesNotMatch(page, /\?parrain=/, 'l’ancien paramètre ne doit plus être utilisé');

  // Progression.
  assert.match(page, /ProgressionBar/);
  assert.match(page, /usedSlots/);
  assert.match(page, /data\.maxReferrals/);

  // Liste des filleuls + états vides et erreur.
  assert.match(page, /data\.referrals\.map/);
  assert.match(page, /EmptyState/);
  assert.match(page, /Aucune invitation/);
  assert.match(page, /Impossible de charger vos parrainages/);
  assert.match(page, /Réessayer/);

  // Copier via le presse-papiers, partager via l'API native.
  assert.match(page, /navigator\.clipboard\.writeText/);
  assert.match(page, /navigator\.share\(/);
});

test('4B — la page explique que la récompense est conditionnelle', () => {
  const page = readApp('src/app/client/parrainage/page.tsx');
  // Le déclencheur est la PREMIÈRE intervention confirmée : sans cette
  // phrase, un filleul inscrit sans mission pourrait croire le crédit acquis.
  assert.match(page, /après la première intervention\s+confirmée/);
  // Apostrophe échappée en JSX (`l&apos;`) : on lit la forme SOURCE.
  assert.match(page, /l&apos;invitation seule ne rapporte rien/);
});

/* ── Inscription ──────────────────────────────────────────────────────── */

test('4B — l’inscription porte un champ de code, facultatif et pré-rempli', () => {
  const form = readApp('src/components/client/client-auth-form.tsx');

  assert.match(form, /referralCodeFromSearch\(window\.location\.search\)/);
  assert.match(form, /Code parrainage \(facultatif\)/);
  assert.match(form, /id="client-referral-code"/);
  assert.match(form, /placeholder="RELIO-XXXXX"/);
  assert.match(form, /referralCode: referralCode\.trim\(\) \|\| undefined/);
  // Jamais requis : le code ne doit pas pouvoir bloquer la soumission.
  assert.doesNotMatch(form, /acceptTerms && referralCode/);
});

test('4B — le code est transmis dans le payload, côté CLIENT seulement', () => {
  const auth = readApp('src/lib/api/auth-service.ts');
  assert.match(auth, /referralCode\?: string/);
  assert.match(auth, /payload\.referralCode = input\.referralCode \|\| undefined/);
  // Le bloc CLIENT est celui qui porte le code : un technicien ne consomme
  // pas d'emplacement de parrain.
  const clientBlock = auth.slice(
    auth.indexOf("if (input.role !== 'TECHNICIAN')"),
    auth.indexOf("if (input.role !== 'TECHNICIAN')") + 400,
  );
  assert.match(clientBlock, /referralCode/);
});

/* ── Centre de notifications ──────────────────────────────────────────── */

test('4B — les notifications de parrainage sont mappées', () => {
  const mapping = readApp('src/lib/notifications/notification-mapping.ts');
  // Le parrain reçoit une ACTION (inviter davantage) ; le filleul un SUIVI
  // (rien à faire de sa part).
  assert.match(mapping, /REFERRAL_REWARDED: 'ACTION'/);
  assert.match(mapping, /REFERRAL_WELCOME: 'FOLLOW_UP'/);
  assert.match(mapping, /label: 'Voir mes parrainages', href: '\/client\/parrainage'/);
  assert.match(mapping, /label: 'Voir mon solde', href: '\/client\/solde'/);
});

test('4B — les montants de parrainage arrivent en entiers dans les métadonnées', () => {
  const notif = readApp('src/lib/api/notifications-service.ts');
  assert.match(notif, /referralRewardXAF\?: number/);
  assert.match(notif, /referralWelcomeXAF\?: number/);
  assert.match(notif, /referralReferredName\?: string/);
  // Aucun montant formaté : `formatFCFA` est le seul point de formatage.
  assert.doesNotMatch(notif, /referralRewardXAF\?: string/);
});

/* ── Garde-fous ───────────────────────────────────────────────────────── */

test('4B — aucun flux existant n’a été touché', () => {
  // Le chantier porte sur le parrainage : ni le barème de commission, ni le
  // module LTV, ni le rail de paiement ne doivent avoir bougé.
  const quote = read('./technician-quote.ts');
  assert.match(quote, /TECHNICIAN_FEE_FIXED_XAF = 500/);
  assert.match(quote, /TECHNICIAN_FEE_RATE_PERCENT = 4/);
  assert.ok(
    existsSync(join(import.meta.dirname, 'rewards-view.ts')),
    'le module de récompenses (chantier 4-FONDATIONS-C) doit toujours exister',
  );
});

test('4B — aucun secret ni payout exposé côté client', () => {
  const page = readApp('src/app/client/parrainage/page.tsx');
  // Le missionscreen client ne doit parler du payout d'aucune sorte : les
  // frais de retrait sont pris en charge par Relio et ne sont pas un objet
  // de la page parrainage.
  for (const forbidden of ['payout', 'chargedAmount', 'fraisSaspay', 'SasPay']) {
    assert.equal(page.includes(forbidden), false, `${forbidden} ne doit pas apparaître sur la page parrainage`);
  }
});