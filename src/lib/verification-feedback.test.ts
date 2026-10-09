/* CHANTIER FIX — « le spinner s'affiche, puis aucun message ».
 *
 * Exécuté avec Node 22+ natif : `node --test src/lib/verification-feedback.test.ts`
 *
 * Vérifications STATIQUES sur les sources (convention du dépôt).
 *
 * LE SYMPTÔME : après « Confirmer mon email », le bouton montrait son spinner
 * puis PLUS RIEN. La cause n'était ni le réseau ni le backend : le panneau
 * se DÉMONTAIT.
 *
 * `handleConfirm` appelait `refresh()`. L'`AuthProvider` passe alors `loading`
 * à `true`, le `RoleGuard` rend `LoadingScreen` À LA PLACE de ses enfants —
 * le `VerificationPanel` est démonté, son état React détruit, puis il remonte
 * sur son état initial : écran « Confirmez votre adresse email », comme si
 * rien ne s'était passé. Le message de succès ne pouvait structurellement pas
 * s'afficher.
 *
 * Ces tests verrouillent les trois décisions qui règlent ça. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');
const panel = (): string => read('../components/auth/verification-panel.tsx');
const code = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

/* ── 1. La cause : plus de refresh() dans le chemin de succès ───────── */

void test('handleConfirm n’appelle PAS refresh() (sinon le panneau se démonte)', () => {
  const source = code(panel());
  const start = source.indexOf('const handleConfirm');
  assert.ok(start > -1, 'handleConfirm introuvable');
  const body = source.slice(start, start + 2200);
  /* Condition de non-régression directe du bug : un `refresh()` ici ferait
   * perdre tout l'état du composant et on n'aurait plus jamais de message. */
  assert.doesNotMatch(body, /await refresh\(\)/);
});

void test('handleConfirm n’appelle plus logout() non plus', () => {
  const source = code(panel());
  const body = source.slice(source.indexOf('const handleConfirm'), source.indexOf('const leaveVerification'));
  /* Depuis D2.5 le backend repose le cookie à chaque `verify-email` :
   * déconnecter aussitôt était une friction sans gain de sécurité. */
  assert.doesNotMatch(body, /logout\(/);
});

/* ── 2. La confirmation survit au remontage ─────────────────────────── */

void test('le succès est mémorisé pour survivre au remontage', () => {
  const source = panel();
  /* Sans trace persistante, un remontage rejoue l'écran initial : c'est
   * exactement le symptôme observé. */
  assert.match(source, /rememberVerifiedToken\(token\)/);
  assert.match(source, /readVerifiedToken\(\)/);
  assert.match(source, /remembered === token/);
});

void test('la clé porte le token, pas un booléen nu', () => {
  const storage = read('./demande-draft-storage.ts');
  assert.match(storage, /VERIFIED_TOKEN_KEY = 'relio_verified_token'/);
  /* Un booléen nu confondrait deux vérifications successives dans la même
   * session. */
  assert.match(storage, /function rememberVerifiedToken\(token: string\)/);
});

void test('un token différent purge l’entrée périmée', () => {
  const source = panel();
  assert.match(source, /if \(remembered\) forgetVerifiedToken\(\)/);
});

/* ── 3. Une seule redirection, et aucune navigation cliente ─────────── */

void test('UNE SEULE redirection : la navigation dure', () => {
  const source = code(panel());
  /* Toutes les sorties passent par ce point unique — pas de doublon possible. */
  const assign = [...source.matchAll(/window\.location\.assign\(/g)];
  assert.equal(assign.length, 1, 'la navigation doit être centralisée');
  /* `router.replace` avait un risque de boucle : le contexte client garde
   * `emailVerified: false` et le RoleGuard renvoie ici. */
  assert.doesNotMatch(source, /router\.(push|replace)\(/);
});

void test('la navigation dure est justifiée dans le code', () => {
  const source = panel();
  /* Une explication sans commentaire de ce type est facile à « simplifier » à
   * tort par un mainteneur, ce qui réintroduirait la boucle. */
  assert.match(source, /NAVIGATION DURE/);
  assert.match(source, /RoleGuard/);
});

void test('?from=demande enchaîne automatiquement après un délai', () => {
  const source = code(panel());
  assert.match(source, /if \(!verified \|\| !fromDemande\) return;/);
  assert.match(source, /VERIFIED_LEAVE_DELAY_MS/);
  assert.match(source, /leaveVerification\('\/client\/demandes'\)/);
});

/* ── 4. L’animation de confirmation ──────────────────────────────────── */

void test('une animation signale la confirmation', () => {
  const source = panel();
  assert.match(source, /function VerifiedAnimation/);
  /* Classes CSS EXISTANTES : aucune dépendance ajoutée, et
   * `prefers-reduced-motion` reste respecté. */
  assert.match(source, /animate-pop-in/);
  assert.match(source, /animate-breathe/);
});

void test('l’animation est présente sur les deux succès', () => {
  const source = panel();
  const verified = [...source.matchAll(/<VerifiedAnimation \/>/g)];
  /* « vérifié maintenant » ET « déjà vérifié » : les deux doivent être
   * signalés pareil, sinon l'utilisateur ne sait pas quoi croire. */
  assert.ok(verified.length >= 2, `animation présente ${verified.length} fois`);
});

void test('aucune animation Lottie ajoutée (les assets existants sont hors sujet)', () => {
  const source = code(panel());
  /* Les Lottie du dépôt parlent d'« envoi de demande » (« demande envoyer »)
   * ou de connexion : les réutiliser pour « e-mail vérifié » serait un mensonge
   * visuel. On cible donc les composants Lottie importés du dépôt, pas notre
   * propre `VerifiedAnimation`. */
  assert.doesNotMatch(source, /lottie-animations/);
  assert.doesNotMatch(source, /(Connexion|DemandeEnvoyee|UssdRecharge|MenuNav|RechercheTechnicien)Animation/);
});

/* ── Non-régression ─────────────────────────────────────────────────── */

void test('le bouton propose l’accès direct (l’utilisateur est connecté)', () => {
  const source = panel();
  assert.match(source, /Accéder à mon espace/);
});

void test('le parcours « renvoyer le lien » reste câblé', () => {
  const source = code(panel());
  assert.match(source, /resendVerification\(accountEmail\)/);
  /* L'INTENTION est vérifiée, pas la forme : le libellé a été raccourci, et
   * l'apostrophe est typographique (U+2019) — `&apos;` dans une expression
   * JavaScript s'afficherait littéralement. On cherche donc le texte, quelle
   * que soit la graphie de l'apostrophe. */
  assert.match(source, /Renvoyer l.\u2019?email/);
});

void test('l’écran de confirmation est toujours là (rien n’a été retiré)', () => {
  const source = panel();
  assert.match(source, /Confirmez votre adresse email/);
  assert.match(source, /Confirmer mon email/);
});

void test('la garde anti-double-appel survit', () => {
  const source = code(panel());
  assert.match(source, /verificationAttempted\.current = true;/);
  assert.match(source, /if \(!token \|\| verificationAttempted\.current\) return;/);
});

void test('le message « lien expiré » et son renvoi subsistent', () => {
  const source = panel();
  assert.match(source, /Ce lien a expiré ou n&apos;est plus valide/);
  assert.match(source, /onClick=\{handleResend\}/);
});