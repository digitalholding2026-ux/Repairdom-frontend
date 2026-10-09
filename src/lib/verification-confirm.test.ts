/* CHANTIER FIX — le token de vérification ne doit plus être consommé avant
 * le clic humain.
 *
 * Exécuté avec Node 22+ natif (type stripping, zéro dépendance) :
 *   node --test src/lib/verification-confirm.test.ts
 * ou : npm run test:unit
 *
 * Vérifications STATIQUES sur les sources (convention du dépôt, cf.
 * `demande-media.test.ts`) : ni rendu React, ni réseau, ni DOM. Ce composant
 * ne peut pas être monté — l'alias `@/` interdit de l'importer — donc on
 * verrouille la STRUCTURE du flux, pas son rendu.
 *
 * Ce que ces tests verrouillent, par ordre d'importance :
 *  1. AUCUN appel réseau au montage quand un token est présent — c'est le
 *     correctif : les scanners de messagerie exécutent le JavaScript et
 *     brûlaient le lien avant l'utilisateur ;
 *  2. l'appel ne part qu'au clic ;
 *  3. le double clic n'envoie qu'une requête. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');

const panel = (): string => read('../components/auth/verification-panel.tsx');

/* Retrait des commentaires : le fichier *parle* de ce qu'il ne fait plus
 * (« AUCUN appel automatique »), et le test porterait sur sa documentation. */
const code = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

/* ── 1. Aucun appel automatique ────────────────────────────────────── */

void test('aucun verifyEmail() au montage', () => {
  /* Point central du correctif. On cherche un appel à `verifyEmail` en dehors
   * du handler de confirmation. */
  const source = code(panel());
  const occurrences = [...source.matchAll(/verifyEmail\(/g)];
  /* Un seul endroit doit appeler : le gestionnaire du bouton. */
  assert.equal(occurrences.length, 1, `verifyEmail appelé ${occurrences.length} fois`);
  const callSite = source.slice(Math.max(0, occurrences[0].index - 500), occurrences[0].index);
  assert.match(callSite, /handleConfirm|const handleConfirm/);
});

void test('pas de useEffect de vérification automatique (le mot verifyEmail n’y figure pas)', () => {
  const source = code(panel());
  /* Tous les effets du fichier ne doivent déclencher que des transitions
   * d'affichage ou un `refresh()` de CONTEXTE — jamais le POST. */
  for (const match of source.matchAll(/useEffect\(\(\) => \{[\s\S]*?\}, \[[^\]]*\]\)/g)) {
    assert.doesNotMatch(match[0], /verifyEmail\(/, 'un useEffect envoie encore le POST');
  }
});

void test('la présence du token déclenche l’écran de confirmation', () => {
  const source = code(panel());
  /* Le motif a volontairement évolué : l'effet Memoire token n'est plus
   * « `if (!token) return;` suivi IMMÉDIATEMENT de `setConfirming(true) ».
   * Un token déjà validé impose `setConfirming(false)` puis `setVerified(true)`
   * pour ne pas renvoyer l'utilisateur sur un écran qui ne mène nulle part.
   *
   * Ce qui est vérifié ici, c'est l'INTENTION — un token présent bascule en
   * confirmation — pas l'absence de code entre la garde et l'appel. On exige
   * donc les deux gardes et l'appel dans le MÊME effet, par ordre, sans
   * exiger qu'ils soient consécutifs. */
  const effect = /useEffect\(\(\) => \{\s*if \(!token\) return;[\s\S]*?setConfirming\(true\);[\s\S]*?\}, \[token\]\)/.exec(
    source,
  );
  assert.ok(effect, 'un token présent doit basculer l’écran en confirmation');
});

/* ── 2. L’appel part au clic ───────────────────────────────────────── */

void test('le bouton « Confirmer mon email » appelle handleConfirm', () => {
  const source = code(panel());
  assert.match(source, /Confirmer mon email/);
  assert.match(source, /onClick=\{handleConfirm\}/);
});

void test('handleConfirm est déclenché uniquement par ce bouton', () => {
  const source = code(panel());
  const definition = source.indexOf('const handleConfirm');
  assert.ok(definition > -1, 'handleConfirm introuvable');
  /* Le handler ne doit rien faire d'autre que vérifier + poster : pas de
   * navigation implicite qui consommerait le token sans geste. */
  /* Le handler est court : on regarde ses 2 000 premiers caractères, de
   * façon à ne pas capturer les effets qui suivent. */
  const body = source.slice(definition, definition + 2000);
  assert.match(body, /verificationAttempted\.current/);
  /* Aucune navigation à l'intérieur du handler : consommer le token doit être
   * l'effet d'un geste, pas d'un effet de bord. */
  assert.doesNotMatch(body.slice(0, 900), /router\.(push|replace)/);
});

/* ── 3. Double clic = une seule requête ────────────────────────────── */

void test('une garde useRef bloque le second envoi', () => {
  const source = code(panel());
  assert.match(source, /const verificationAttempted = useRef\(false\)/);
  assert.match(
    source,
    /if \(!token \|\| verificationAttempted\.current\) return;/,
  );
  assert.match(source, /verificationAttempted\.current = true;/);
});

void test('le garde est relâché UNIQUEMENT en cas d’erreur métier (pas en cas de succès)', () => {
  const source = code(panel());
  /* Remettre le garde à `false` permet de réessayer après un token réellement
   * invalide — c'est le renvoi qui suit. Le remettre après un succès
   * permettrait un second POST, donc un 400 : ce serait une régression. */
  const resets = [...source.matchAll(/verificationAttempted\.current = false;/g)];
  assert.equal(resets.length, 1, 'le garde ne doit être relâché qu’une fois');
  const context = source.slice(resets[0].index - 700, resets[0].index + 40);
  assert.match(context, /catch|setError/);
});

/* ── 4. « Déjà vérifié » traité comme un succès ────────────────────── */

void test('le service expose alreadyVerified', () => {
  const service = read('./api/auth-service.ts');
  assert.match(service, /interface VerifyEmailResult/);
  assert.match(service, /alreadyVerified\?: boolean;/);
});

void test('le panneau distingue « déjà vérifié » de « vérifié maintenant »', () => {
  const source = code(panel());
  assert.match(source, /if \(session\.alreadyVerified\) setAlreadyVerified\(true\);\s*else setVerified\(true\);/);
});

void test('« Déjà vérifié » affiche un message positif, pas une erreur', () => {
  const source = panel();
  assert.match(source, /title="Votre email est déjà vérifié"/);
  /* Et non un Alert variant="error" : ce n'est pas un échec. */
  const block = source.slice(source.indexOf('if (alreadyVerified)'));
  assert.doesNotMatch(block.slice(0, 600), /variant="error"/);
});

/* ── 5. Token invalide : message clair + renvoi ────────────────────── */

void test('token invalide : message explicite et action de renvoi', () => {
  const source = panel();
  /* Dans le JSX l'apostrophe est échappée en `&apos;` : on cherche la
   * source LITTÉRALE, pas le texte rendu. */
  assert.match(source, /Ce lien a expiré ou n&apos;est plus valide/);
  /* Le renvoi doit rester accessible dans cet état, sinon l'utilisateur est
   * bloqué sur une page d'erreur. */
  assert.match(source, /onClick=\{handleResend\}/);
});

void test('le flux « renvoyer le lien » reste câblé et inchangé', () => {
  const source = code(panel());
  /* Libellé raccourci, apostrophe typographique : l'intention (le renvoi
   * existe et vise cette adresse) est vérifiée, pas la graphie. */
  assert.match(source, /Renvoyer l.\u2019?email/);
  assert.match(source, /resendVerification\(accountEmail\)/);
});

void test('le message trompeur « Adresse inconnue » a disparu', () => {
  /* On compare le CODE, commentaires retirés : la chaîne survit légitimement
   * dans un commentaire qui explique pourquoi elle a été retirée, et un
   * `doesNotMatch` sur la source brute échouerait à tort. C'est exactement le
   * piège des tests trop naïfs — ici, c'est le test qu'il faut corriger. */
  const source = code(panel());
  assert.doesNotMatch(source, /Adresse inconnue/);
  /* Remplacé par une explication qui ne laisse pas croire à un problème.
   * La formulation a été resserrée (« associé à ce compte » → « votre
   * compte ») : on vérifie l'intention, pas la phrase exacte. */
  assert.match(panel(), /Nous n&apos;avons pas identifié votre compte/);
});

/* ── Non-régression du tunnel D2/D2.5 ──────────────────────────────── */

void test('le comportement ?from=demande est préservé', () => {
  const source = code(panel());
  /* La session posée à l’inscription ne doit JAMAIS disparaître avec la
   * demande juste envoyée.
   *
   * Ce test cherchait `if (!fromDemande) {` et `router.replace(…)`. Les deux
   * ont été supprimés depuis, pour de bonnes raisons :
   *   - le `logout()` qu'ils protégeaient n'existe plus du tout (le mot
   *     n'apparaît plus que dans un commentaire qui l'explique) ;
   *   - la redirection passe par `leaveVerification`, qui fait un
   *     `window.location.assign` — un rechargement complet, là où
   *     `router.replace` laissait un contexte client périmé.
   *
   * On vérifie donc le COMPORTEMENT : le tunnel de demande est toujours isolé,
   * et il mène toujours à la liste des missions. */
  assert.match(source, /if \(!verified \|\| !fromDemande\) return;/);
  assert.match(source, /leaveVerification\('\/client\/demandes'\)/);
  assert.match(source, /if \(fromDemande\)/);
  /* Et le mécanisme de sortie ne déconnecte plus personne. */
  assert.doesNotMatch(code(source), /logout\(/);
});

void test('la redirection forcée reste absente (une boucle se recréerait)', () => {
  const source = panel();
  assert.doesNotMatch(source, /setTimeout[\s\S]{0,400}router\.(push|replace)\('\/client\/demandes'\)/);
});

void test('le même composant sert le parcours technicien (logique partagée)', () => {
  const page = read('../app/technicien/verification/page.tsx');
  assert.match(page, /VerificationPanel/);
  /* Le technicien passe par le même écran de confirmation : rien de
   * spécifique au client ne doit conditionner le token. */
  const source = code(panel());
  assert.doesNotMatch(source.slice(source.indexOf('const handleConfirm')), /role === 'CLIENT' &&/);
});