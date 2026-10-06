/* CHANTIER D2.5 — tunnel de demande débloqué + relances e-mail.
 *
 * Exécuté avec Node 22+ natif (type stripping, zéro dépendance) :
 *   node --test src/lib/demande-draft-d2_5.test.ts
 * ou : npm run test:unit
 *
 * Vérifications STATIQUES sur les sources (convention du dépôt, cf.
 * `demande-media.test.ts`) : ni rendu React, ni réseau, ni DOM.
 *
 * Ce fichier verrouille le CÔTÉ FRONTEND du chantier D2.5 : le blocage décrit
 * dans le rapport D2 (« l'inscription ne connecte pas → convert 401 ») ne
 * peut plus se traduire par un dead-end côté interface. Le brouillon doit être
 * converti même si l'e-mail est à vérifier, et l'utilisateur doit atterrir sur
 * la vérification — pas sur une erreur qui ressemble à un échec.
 *
 * Les counterparts backend (cookie posé sans condition, scheduler de
 * relances) sont testés dans le dépôt backend, où ils appartiennent : ce
 * fichier ne lit JAMAIS `../../backend`, qui n'existe pas dans le dépôt
 * frontend seul (CI, Vercel). */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');

/* Retrait des commentaires : nos fichiers *parlent* des chaînes recherchées
 * (« le conditionnel `if (user.emailVerified)` »…), et le test porterait alors
 * sur sa propre documentation. */
/* ── La conversion a lieu même sans e-mail vérifié ────────────────── */

void test('D2.5 : handleAuthSuccess convertit le brouillon même non vérifié', () => {
  const wizard = read('../components/client/demande-wizard.tsx');
  /* L'ancien court-circuit `if (emailVerified === false) { …; return; }`
   * AVANT la conversion est précisément le bug du rapport D2. */
  const block = wizard.slice(wizard.indexOf('const handleAuthSuccess'));
  const body = block.slice(0, block.indexOf('const runDraftConversion') > -1 ? 1200 : 1200);
  assert.doesNotMatch(body, /emailVerified === false\) \{[\s\S]{0,220}?return;/);
  /* La conversion est déclenchée AVANT toute condition sur l'e-mail. */
  assert.match(body, /await refresh\(\);[\s\S]*?await runDraftConversion\(\)/);
});

void test('D2.5 : la conversion renvoie un statut exploitable', () => {
  const wizard = read('../components/client/demande-wizard.tsx');
  /* Sans statut de retour, le wizard ne peut pas distinguer « parti » de
   * « échec » et afficherait un message trompeur. */
  assert.match(wizard, /type ConversionOutcome = 'done' \| 'media-failed' \| 'unauthorized' \| 'error'/);
  assert.match(wizard, /return 'unauthorized';/);
  assert.match(wizard, /return 'media-failed';/);
});

void test('D2.5 : un 401 propose de se reconnecter (et non « Réessayez »)', () => {
  const wizard = read('../components/client/demande-wizard.tsx');
  assert.match(wizard, /err\.status === 401/);
  assert.match(wizard, /Connexion requise\. Reconnectez-vous/);
  assert.match(wizard, /showSignInCta=\{needsSignIn\}/);
});

void test('D2.5 : la modale expose l’action « Se connecter »', () => {
  const modal = read('../components/client/demande-auth-modal.tsx');
  assert.match(modal, /Se connecter/);
  /* Le bouton doit réellement basculer l'onglet, pas juste effacer l'erreur. */
  assert.match(modal, /signInRequestId/);
  assert.match(modal, /setTab\('signin'\)/);
});

/* ── Après conversion : la route de vérification ───────────────────── */

void test('D2.5 : e-mail non vérifié → /client/verification?from=demande', () => {
  const wizard = read('../components/client/demande-wizard.tsx');
  assert.match(
    wizard,
    /\/client\/verification\?email=\$\{encodeURIComponent\(verifiedUser\.email\)\}&from=demande/,
  );
});

void test('D2.5 : e-mail vérifié → la confirmation reste la sortie', () => {
  const wizard = read('../components/client/demande-wizard.tsx');
  /* Le chemin historique ne doit pas avoir bougé. */
  assert.match(wizard, /\/client\/confirmation\?ref=/);
});

/* ── Le panneau de vérification ────────────────────────────────────── */

void test('D2.5 : le panneau lit ?from=demande', () => {
  const panel = read('../components/auth/verification-panel.tsx');
  assert.match(panel, /params\.get\('from'\) === 'demande'/);
});

void test('D2.5 : ?from=demande SUPPRIME le logout (sinon la session est détruite)', () => {
  /* Point le plus subtil du chantier : le panneau déconnectait
   * systématiquement après vérification. Depuis D2.5 le cookie est posé dès
   * l'inscription, donc ce logout détruirait la session qui donne accès à la
   * demande tout juste envoyée. */
  const panel = read('../components/auth/verification-panel.tsx');
  assert.match(panel, /if \(!fromDemande\) \{\s*try \{\s*await logout\(\);/);
});

void test('D2.5 : ?from=demande redirige vers /client/demandes après vérification', () => {
  const panel = read('../components/auth/verification-panel.tsx');
  assert.match(panel, /router\.replace\('\/client\/demandes'\)/);
});

void test('D2.5 : la redirection ATTEND user.emailVerified (pas de boucle RoleGuard)', () => {
  /* Pousser avant la mise à jour du contexte ferait rebondir le RoleGuard
   * vers /client/verification : aller-retour visible. */
  const panel = read('../components/auth/verification-panel.tsx');
  const effect = panel.slice(panel.indexOf('if (!verified || !fromDemande) return;'));
  assert.match(effect.slice(0, 300), /if \(!user\?\.emailVerified\) return;/);
  assert.match(effect.slice(0, 300), /router\.replace\('\/client\/demandes'\)/);
});

void test('D2.5 : sans ?from=demande, le comportement historique est intact', () => {
  const panel = read('../components/auth/verification-panel.tsx');
  /* Le logout et le bouton « Aller à la connexion » restent pour le flux
   * d'inscription classique. */
  assert.match(panel, /await logout\(\)/);
  assert.match(panel, /Aller à la connexion/);
});

void test('D2.5 : ?from=demande propose « Voir mes demandes »', () => {
  const panel = read('../components/auth/verification-panel.tsx');
  assert.match(panel, /Voir mes demandes/);
});

/* ── Le tunnel reste cohérent de bout en bout ──────────────────────── */

void test('D2.5 : le texte d’échec de D2 a disparu du wizard', () => {
  const wizard = read('../components/client/demande-wizard.tsx');
  /* Ce message affirmait que la demande ne pouvait PAS partir. C'était vrai
   * en D2, c'est faux depuis D2.5 : le laisser serait un mensonge. */
  assert.doesNotMatch(wizard, /vérifiez votre boîte mail pour confirmer votre adresse, puis revenez vous connecter/);
});

void test('D2.5 : le mode authentifié reste inchangé', () => {
  const wizard = read('../components/client/demande-wizard.tsx');
  assert.match(wizard, /await createDemande\(\{/);
  assert.match(wizard, /await submitAsAuthenticatedClient\(\);/);
});

void test('D2.5 : le brouillon est toujours effacé après conversion', () => {
  const wizard = read('../components/client/demande-wizard.tsx');
  assert.match(wizard, /clearDemandeDraftToken\(\)/);
});

void test('D2.5 : le token de brouillon n’est jamais journalisé', () => {
  for (const file of [
    '../components/client/demande-wizard.tsx',
    '../components/auth/verification-panel.tsx',
    '../components/client/demande-auth-modal.tsx',
  ]) {
    for (const line of read(file).split('\n')) {
      if (!/console\.(log|warn|error|info|debug)/.test(line)) continue;
      assert.doesNotMatch(
        line,
        /draftToken|readDemandeDraftToken|created\.token|verificationToken|set-cookie/i,
        `${file} journalise peut-être un secret : ${line.trim()}`,
      );
    }
  }
});