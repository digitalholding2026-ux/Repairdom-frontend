/* Panneau de vérification email — actions et détection de boîte mail.
 *
 * Exécuté avec Node 22+ natif (type stripping, zéro dépendance) :
 *   node --test src/lib/verification-panel-actions.test.ts
 * ou : npm run test:unit
 *
 * POURQUOI CE TEST EXISTE
 * Une page d'attente qui n'offre aucune action utile fait abandonner : le
 * visiteur ne sait pas où sont ses emails, ne peut pas se renvoyer le lien, et
 * n'a aucun moyen de vérifier s'il a cliqué. Trois actions doivent coexister —
 * ouvrir la boîte, renvoyer, revérifier — et chacune peut disparaître en
 * silence : une condition mal écrite retire un bouton sans lever la moindre
 * erreur, et rien d'autre dans le dépôt ne le signalerait.
 *
 * La détection de fournisseur est, elle, testée par EXÉCUTION : la fonction
 * est importée et appelée avec des adresses réelles. Une regex sur le source
 * prouverait seulement que le nom du fournisseur est écrit quelque part,
 * pas qu'une adresse donnée est reconnue.
 *
 * Ce test est majoritairement STATIQUE (readFileSync + assertions sur le
 * texte) : les motifs surveillés ci-dessous n'apparaissent dans aucun des
 * commentaires des fichiers lus.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getMailboxUrl, SUPPORTED_MAILBOX_DOMAINS } from './mailbox';

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');

const panel = read('../components/auth/verification-panel.tsx');
const clientLayout = read('../app/client/layout.tsx');
const techLayout = read('../app/technicien/layout.tsx');
const clientPage = read('../app/client/verification/page.tsx');
const techPage = read('../app/technicien/verification/page.tsx');

/* ── 1. Détection du fournisseur — exécutée ──────────────────────────── */

void test('la détection couvre les messageries principales', () => {
  for (const domain of ['gmail.com', 'outlook.com', 'yahoo.com', 'proton.me', 'icloud.com']) {
    assert.ok(getMailboxUrl(`compte@${domain}`), `adresse @${domain} non reconnue`);
  }
});

void test('un domaine inconnu ne produit aucun lien', () => {
  /* Le cas le plus fréquent au Cameroun : une adresse de domaine local ou
   * d'un hébergeur peu connu. Un lien deviné mènerait nulle part — pire que
   * pas de lien du tout, qui renvoie vers l'application email. */
  assert.equal(getMailboxUrl('contact@exemple.cm'), null);
  assert.equal(getMailboxUrl('contact@relio.cm'), null);
});

void test('un domaine ajouté à la liste est réellement reconnu', () => {
  /* Garde-fou contre une liste déclarée mais non raccordée au retour : si
   * `MAILBOXES` servait seulement à l'export public, ce test passerait quand
   * même alors que la fonction ignorerait les nouveaux domaines. */
  for (const domain of SUPPORTED_MAILBOX_DOMAINS) {
    const found = getMailboxUrl(`compte@${domain}`);
    assert.ok(found, `déclaré dans la liste mais non reconnu : ${domain}`);
    assert.match(found.url, /^https:\/\//);
  }
});

void test('les alias de fournisseur sont reconnus', () => {
  /* `googlemail.com` est l'exportation de Gmail, `hotmail`/`live` appartiennent
   * au même opérateur qu'`outlook` : sans ces alias, ces comptes — très
   * nombreux — tomberaient dans le message générique. */
  assert.equal(getMailboxUrl('a@googlemail.com')?.label, 'Gmail');
  assert.equal(getMailboxUrl('a@hotmail.fr')?.label, 'Outlook');
  assert.equal(getMailboxUrl('a@live.com')?.label, 'Outlook');
});

void test('la casse du domaine est normalisée', () => {
  /* Une adresse à majuscule est parfaitement valide et Gmail l'accepte. */
  assert.equal(getMailboxUrl('Compte@GMAIL.COM')?.label, 'Gmail');
});

void test('une adresse inexploitable ne lève pas', () => {
  /* Aucune de ces entrées ne doit faire échouer la fonction : l'appelant
   * n'a pas à protéger l'appel, et une exception ici casserait le rendu de la
   * page entière. */
  for (const entry of [null, undefined, '', 'pas-une-adresse', 'a@', 'a@b']) {
    assert.equal(getMailboxUrl(entry), null, `${String(entry)} aurait dû renvoyer null`);
  }
});

void test('les URL pointent vers la boîte, pas vers une page d’accueil', () => {
  /* Une redirection vers la page d'accueil du fournisseur laisserait le
   * visiteur chercher son lien dans le vide. */
  assert.match(getMailboxUrl('a@gmail.com')!.url, /^https:\/\/mail\.google\.com/);
  assert.match(getMailboxUrl('a@outlook.com')!.url, /^https:\/\/outlook\.live\.com\/mail/);
  assert.ok(SUPPORTED_MAILBOX_DOMAINS.length >= 10);
});

/* ── 2. Les trois actions coexistent ─────────────────────────────────── */

/* Une seule action ne suffit pas à l'utilisateur bloqué : il peut avoir
 * changé de fournisseur,.want son lien, ou avoir déjà cliqué sans que la
 * session le reflète. Les trois boutons doivent donc être présents. */
void test('ouvrir la boîte, renvoyer et revérifier sont tous proposés', () => {
  assert.match(panel, /Ouvrir \{mailbox\.label\}/);
  /* Apostrophe typographique, PAS une entité HTML. Ces deux libellés sont
   * des expressions JavaScript : `&apos;` y est une chaîne de sept caractères
   * affichée telle quelle. Le bug a été livré en production avant d'être
   * vu — le test vérifie donc le caractère réel. */
  assert.match(panel, /'Renvoyer l’email'/);
  assert.match(panel, /'J’ai vérifié mon email'/);
});

void test('aucune entité HTML ne fuit dans une expression JavaScript', () => {
  /* Les entités ne sont interprétées que dans le JSX. Placées dans une
   * expression — `{condition ? 'a' : 'b &apos; c'}` — elles s'affichent
   * littéralement. Le test cherche toute chaîne entre apostrophes simples
   * contenant une entité, hors commentaire. */
  const code = panel
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
  for (const ligne of code.split('\n')) {
    for (const [, contenu] of ligne.matchAll(/'([^'\n]*)'/g)) {
      assert.doesNotMatch(
        contenu,
        /&(apos|nbsp|amp|lt|gt|quot);/,
        `entité HTML dans une expression JavaScript : ${contenu}`,
      );
    }
  }
});

void test('un fournisseur inconnu n’ouvre aucun lien', () => {
  /* Le bouton existe mais reste inactif, avec une explication : c'est
   * préférable à un lien deviné. */
  assert.match(panel, /Ouvrez votre application email pour retrouver le lien/);
  assert.match(panel, /Ouvrir ma boîte mail/);
});

void test('le lien de boîte mail s’ouvre en sécurité', () => {
  assert.match(panel, /rel="noopener noreferrer"/);
  assert.match(panel, /target="_blank"/);
});

/* ── 3. Renvoi : anti-spam ──────────────────────────────────────────── */

void test('le renvoi passe par l’API, sur l’adresse connue', () => {
  assert.match(panel, /resendVerification\(accountEmail\)/);
});

void test('le renvoi est bloqué pendant un délai', () => {
  /* Sans ce garde, un clic répété envoie autant d'emails que le visiteur le
   * souhaite : c'est le seul appel mutating de la page.
   *
   * Les deux verrous sont vérifiés séparément — le handler ET l'attribut
   * `disabled`. Une expression `cooldown > 0` qui apparaît ailleurs dans le
   * fichier ne prouverait rien sur le bouton lui-même. */
  assert.match(panel, /RESEND_COOLDOWN_SECONDS = 60/);
  assert.match(panel, /if \(!accountEmail \|\| resendBusy \|\| cooldown > 0\) return;/);
  assert.match(panel, /disabled=\{cooldown > 0\}/);
  assert.match(panel, /Renvoyer dans \$\{cooldown\}s/);
});

void test('le compte à rebours est annoncé et n’est pas une simple boucle', () => {
  /* Le décompte doit être unedécroissance de seconde par seconde, sinon le bouton ne se
   * réactiverait jamais : un `setTimeout` unique qui remet le compteur à
   * zéro ne correspond pas au texte affiché. */
  assert.match(panel, /const timer = window\.setTimeout\(\(\) => setCooldown\(\(value\) => value - 1\), 1000\)/);
});

void test('le compte à rebours est annoncé aux technologies d’assistance', () => {
  /* Un minuteur muet n'existe pas pour un lecteur d'écran : le compte
   * descend sans que rien ne soit dit. */
  assert.match(panel, /aria-live="polite"/);
  assert.match(panel, /Nouveau lien disponible dans \$\{cooldown\} secondes/);
});

/* ── 4. Revérification ───────────────────────────────────────────────── */

void test('« j’ai vérifié » interroge le serveur et non l’état local', () => {
  /* Un test purement client afficherait « vérifié » sans que l'email ait
   * jamais été ouvert. L'état doit venir de l'API. */
  assert.match(panel, /getMe\(\)/);
  assert.match(panel, /account\.emailVerified/);
});

void test('la revérification est protégée contre le martèlement', () => {
  assert.match(panel, /REFRESH_COOLDOWN_SECONDS = 5/);
  assert.match(panel, /lastRefreshAt/);
});

void test('un compte non vérifié reçoit une explication, pas un échec', () => {
  assert.match(panel, /Pas encore vérifié/);
});

/* ── 5. Écrans et logos ──────────────────────────────────────────────── */

void test('le double logo est supprimé sur les deux pages', () => {
  /* Le header global est masqué sur ces routes ; s'il restait un logo dans
   * l'un des deux wrappers, la page afficherait deux marques. */
  assert.match(clientLayout, /'\/client\/verification'/);
  assert.match(techLayout, /'\/technicien\/verification'/);
  for (const [nom, source] of [
    ['client', clientPage],
    ['technicien', techPage],
  ] as const) {
    assert.equal(
      (source.match(/<BrandLogo/g) ?? []).length,
      1,
      `${nom}: un seul logo attendu sur la page`,
    );
  }
});

void test('l’écran de confirmation du lien reste disponible', () => {
  /* Le flux par token n'a pas été touché : c'est lui qui active réellement
   * le compte. Un garde-fou explicite vaut mieux qu'une confiance. */
  assert.match(panel, /Confirmez votre adresse email/);
  assert.match(panel, /Confirmer mon email/);
  assert.match(panel, /handleConfirm/);
});

void test('le retour propose la connexion, ou l’inscription si l’adresse est connue', () => {
  assert.match(panel, /Utiliser une autre adresse/);
  assert.match(panel, /Retour à la connexion/);
  assert.match(panel, /signupHref/);
});