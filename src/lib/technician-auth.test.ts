/* Chantier #5B — ville de référence + coquille split technicien + boucle /zones.
 *
 * Exécuté avec Node 24 natif (type stripping, zéro dépendance) :
 *   node --test src/lib/technician-auth.test.ts
 * ou : npm run test:unit
 *
 * Ces tests portent sur des CONTRATS vérifiés par lecture statique des sources
 * (comme `no-middleware.test.ts` et `design-system.test.ts`) : le rendu React
 * n'est pas monté, mais on garantit que les invariants qui ont motivé le
 * chantier ne peuvent pas régresser en silence.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');

const technicianForm = read('../components/technician/technician-auth-form.tsx');
const authSplit = read('../components/auth/auth-split.tsx');
const technicianSplit = read('../components/auth/technician-auth-split.tsx');
const inscriptionPage = read('../app/technicien/inscription/page.tsx');
const connexionPage = read('../app/technicien/connexion/page.tsx');
const technicienLayout = read('../app/technicien/layout.tsx');
const zonesPage = read('../app/technicien/zones/page.tsx');
const technicianService = read('./api/technician-service.ts');
const authService = read('./api/auth-service.ts');

/* ── Partie B — ville de référence à l'inscription ──────────────────────── */

void test('#5B — la ville est un Select alimenté par GET /cities, plus un texte libre', () => {
  assert.match(technicianForm, /listCities/);
  /* Le champ texte libre `tech-city` a DISPARU : c'est lui qui empêchait tout
   * rattachement au référentiel. */
  assert.doesNotMatch(technicianForm, /id="tech-city"[\s\S]{0,200}<Input/);
  assert.match(technicianForm, /<Select\s+id="tech-city"/);
  /* La valeur transmise est l'identifiant de la ville, pas son nom. */
  assert.match(technicianForm, /<option key=\{city\.id\} value=\{city\.id\}>/);
  assert.match(technicianForm, /Sélectionnez votre ville/);
});

void test('#5B — le Select ville est désactivé tant que les villes ne sont pas chargées', () => {
  assert.match(
    technicianForm,
    /disabled=\{citiesLoading \|\| cities\.length === 0\}/,
  );
  assert.match(technicianForm, /Chargement des villes…/);
});

void test('#5B — un échec de chargement propose un réessai (jamais un Select vide)', () => {
  assert.match(technicianForm, /Impossible de charger les villes\. Réessayez\./);
  assert.match(technicianForm, /void loadCities\(\)/);
  assert.match(technicianForm, /\{citiesError \?/);
});

void test('#5B — canSubmit exige une ville de RÉFÉRENCE choisie', () => {
  assert.match(technicianForm, /cityId !== ''/);
  assert.match(technicianForm, /disabled=\{!canSubmit\}/);
  /* Le texte libre ne doit plus rien piloter côté soumission. */
  assert.doesNotMatch(technicianForm, /city\.trim\(\) !== ''/);
});

void test('#5B — le payload envoie cityId et NON city', () => {
  // On isole le LITTÉRAL envoyé à `signUp` : c'est lui qui fait foi, pas la
  // présence du mot « city » ailleurs dans le fichier (variable supprimée,
  // libellés, commentaires).
  const payload = technicianForm.slice(
    technicianForm.indexOf('await signUp({'),
    technicianForm.indexOf(': await signIn('),
  );
  assert.ok(payload.length > 0, 'appel signUp localisé');
  assert.match(payload, /cityId,/);
  // Aucune clé `city:` dans le payload : c'est la référence qui part.
  assert.doesNotMatch(payload, /\bcity:/);
  /* Le contrat du service expose bien cityId. */
  assert.match(authService, /cityId\?: string/);
});

/* ── Partie C — coquille split technicien ──────────────────────────────── */

void test('#5B — inscription et connexion technicien utilisent AuthSplit, plus AuthCard', () => {
  assert.match(inscriptionPage, /TechnicianAuthSplit/);
  assert.match(connexionPage, /TechnicianAuthSplit/);
  assert.doesNotMatch(inscriptionPage, /AuthCard/);
  assert.doesNotMatch(connexionPage, /AuthCard/);
  /* Un seul composant d'entrée, réutilisé comme pour le client. On vérifie
   * l'IMPORT et non le mot « AuthCard » : le commentaire de migration cite
   * l'ancien composant, ce qui est légitime. */
  assert.match(technicianSplit, /import \{ AuthSplit, TECHNICIAN_GUARANTEES \}/);
  assert.doesNotMatch(technicianSplit, /<AuthCard/);
});

void test('#5B — le tunnel technicien est IMMERSIF (header global masqué)', () => {
  // Même mécanisme que client/layout.tsx (coquille split qui pose son logo).
  assert.match(technicienLayout, /TECHNICIAN_IMMERSIVE_AUTH_PATHS/);
  assert.match(
    technicienLayout,
    /const TECHNICIAN_IMMERSIVE_AUTH_PATHS = \['\/technicien\/inscription', '\/technicien\/connexion'\]/,
  );
  assert.match(technicienLayout, /isImmersiveAuth \? null : \(/);
  /* Le conteneur passe en pleine largeur sur ces routes. */
  assert.match(technicienLayout, /isImmersiveAuth \? 'max-w-none px-0 py-0'/);
});

void test('#5B — le header reste sur les AUTRES pages technicien', () => {
  // La liste immersive ne doit contenir QUE les deux routes d'entrée.
  const list = /TECHNICIAN_IMMERSIVE_AUTH_PATHS = \[([^\]]*)\]/.exec(technicienLayout);
  assert.ok(list, 'liste des routes immersives déclaree');
  assert.doesNotMatch(list![1]!, /zones|profil|kyc|demandes/);
  // Dashboard, profil, KYC et zones gardent header + sidebar + bottom nav.
  assert.match(technicienLayout, /showPrivateChrome && !isPublicPath \? \(/);
});

void test('#5B — AuthSplit accepte des garanties propres au contexte technicien', () => {
  assert.match(authSplit, /guarantees\?: AuthGuarantee\[\]/);
  assert.match(authSplit, /guarantees = GUARANTEES/);
  /* Les garanties par défaut restent orientées client : le panneau client ne
   * doit pas changer (chantier #3). */
  assert.match(authSplit, /title: 'Devis avant travaux'/);
  assert.match(authSplit, /title: 'Paiement après validation'/);
});

void test('#5B — les garanties technicien ne promettent pas au technicien ce qu’il ne fait pas', () => {
  assert.match(authSplit, /export const TECHNICIAN_GUARANTEES/);
  const block = authSplit.slice(
    authSplit.indexOf('TECHNICIAN_GUARANTEES'),
    authSplit.indexOf('export function AuthSplit'),
  );
  // Un technicien ne paie pas et ne fait pas valider son DEVIS : le panneau
  // doit parler de zones, d'identité vérifiée et de paiement RECEVOIR.
  assert.match(block, /Missions dans vos zones/);
  assert.match(block, /Identité vérifiée une fois/);
  assert.match(block, /Vous êtes payé/);
  assert.doesNotMatch(block, /Vous ne payez qu/);
  /* Et les deux pages passent bien cette liste. */
  assert.match(technicianSplit, /guarantees=\{TECHNICIAN_GUARANTEES\}/);
});

void test('#5B — les liens de pied du tunnel technicien ne pointent pas vers le client', () => {
  assert.match(technicianSplit, /'\/technicien\/connexion'/);
  assert.match(technicianSplit, /'\/devenir-technicien'/);
  assert.doesNotMatch(technicianSplit, /\/client\//);
});

/* ── Partie D — plus de boucle ville ↔ zones ───────────────────────────── */

void test('#5B — /zones propose le Select ville AU LIEU d’un renvoi vers /profil', () => {
  assert.match(zonesPage, /updateTechnicianProfile/);
  assert.match(zonesPage, /<Select\s+id="reference-city"/);
  assert.match(zonesPage, /Sélectionnez votre ville de référence/);
  assert.match(zonesPage, /cityChooserOpen/);
  /* Le renvoi vers le profil a disparu : c'est LA boucle du Problème 2. */
  assert.doesNotMatch(zonesPage, /href="\/technicien\/profil"/);
  assert.doesNotMatch(zonesPage, /Aller à mon profil/);
});

void test('#5B — changer de ville écrit la RÉFÉRENCE puis recharge la couverture', () => {
  assert.match(zonesPage, /updateTechnicianProfile\(\{ cityId \}\)/);
  // Les zones disponibles dépendent de la ville : on les relit côté serveur.
  assert.match(zonesPage, /setCoverage\(await getTechnicianCoverage\(\)\)/);
  /* Le service accepte cityId dans le PATCH. */
  assert.match(technicianService, /cityId\?: string/);
});

void test('#5B — une ville déjà choisie reste modifiable (« Changer de ville »)', () => {
  assert.match(zonesPage, /setChangingCity\(true\)/);
  assert.match(zonesPage, /Changer de ville/);
  // Sans ce retour en arrière, changer de ville serait définitif.
  assert.match(zonesPage, /const cityChooserOpen = changingCity \|\| !referenceCity/);
});

void test('#5B — les zones proposées restent celles de la ville de référence', () => {
  // Garde-fou : le Select ville ne doit pas ouvrir la porte à d'autres villes.
  assert.match(zonesPage, /if \(!referenceCity\) return \[\];/);
  assert.match(zonesPage, /referenceCity\.zones/);
});