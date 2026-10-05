/* CHANTIER PROFIL TECHNICIEN + KYC DÉDIÉ — contrats structurels.
 *
 * Exécuté avec Node 24 natif (type stripping, zéro dépendance) :
 *   node --test src/lib/technician-kyc.test.ts
 * ou : npm run test:unit
 *
 * Ces tests vérifient des CONTRATS (séparation profil / KYC, cohérence des
 * contrats d'API, règles d'âge) par lecture statique des sources et par
 * exécution des helpers purs. Aucune opération réseau, aucune base.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toActionableErrorMessage, toUserErrorMessage } from './ui-error-message.ts';

import {
  TECHNICIAN_MINIMUM_AGE,
  activityTypeLabel,
  computeAge,
  identityDocumentLabel,
  meetsMinimumAge,
  requiredIdentitySides,
} from './technician-kyc-rules.ts';

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');

const profilePage = read('../app/technicien/profil/page.tsx');
const kycPage = read('../app/technicien/kyc/page.tsx');
const technicianService = read('./api/technician-service.ts');

/* ── §1 / §12 / §24 — séparation profil et KYC ────────────────────────── */

void test('la KYC a une page DÉDIÉE, distincte du profil', () => {
  assert.ok(kycPage.length > 0, 'page /technicien/kyc présente');
  // Le profil ne doit plus NI contenir le formulaire KYC…
  assert.doesNotMatch(profilePage, /kyc-section/);
  assert.doesNotMatch(profilePage, /uploadTechnicianKycDocument/);
  assert.doesNotMatch(profilePage, /submitTechnicianKyc/);
  // …ni demander les champs d'identité KYC (ils vivent sur la page KYC).
  assert.doesNotMatch(profilePage, /birthDate/, 'date de naissance absente du profil');
  assert.doesNotMatch(profilePage, /kycIdentityDocType/, 'type de pièce absent du profil');
});

void test('le profil reste professionnel : contact, activité, compétences, zones', () => {
  for (const needle of [
    'ContactSection',
    'ActivitySection',
    'SkillsSection',
    '/technicien/zones',
  ]) {
    assert.ok(profilePage.includes(needle), `profil : ${needle}`);
  }
});

void test('la page KYC couvre les étapes du parcours attendu', () => {
  // Timeline : identité → document → faces → preuve pro → soumission.
  // L'étape « en attente » N'EST PAS une étape de parcours : c'est un état
  // final, ce qui évite qu'une étape reste bloquée derrière un statut.
  for (const step of ['identity', 'document', 'documents', 'professional', 'submit']) {
    assert.ok(kycPage.includes(`${step}:`), `étape KYC : ${step}`);
  }
  assert.match(kycPage, /awaitingReview/, 'état « en attente / vérifié » traité à part');
  // Sections numérotées visibles.
  assert.match(kycPage, /1\. Identité/);
  assert.match(kycPage, /2\. Document d’identité/);
  assert.match(kycPage, /3\. Photos du document/);
  assert.match(kycPage, /4\. Justificatif professionnel \(facultatif\)/);
  assert.match(kycPage, /5\. Transmission à Relio/);
});

/* ── §15 — recto / verso, remplacement, suppression ───────────────────── */

void test('la page KYC gère sélection, remplacement et suppression des pièces', () => {
  assert.match(kycPage, /uploadTechnicianKycDocument/);
  assert.match(kycPage, /deleteTechnicianKycDocument/);
  assert.match(kycPage, /Remplacer/);
  assert.match(kycPage, /Supprimer/);
  // Prévisualisation par URL signée (jamais d'URL publique).
  assert.match(kycPage, /getTechnicianKycDocumentUrl/);
  assert.match(kycPage, /submitTechnicianKyc/);
});

void test('le dépôt transmet la face (RECTO/VERSO/SINGLE) — sinon une CNI s’écrase', () => {
  assert.match(technicianService, /formData\.append\('side', side\)/);
  assert.match(technicianService, /uploadTechnicianKycDocument[\s\S]*?side: KycDocumentSide/);
});

/* ── §6 — deux numéros, message d'aide explicite ──────────────────────── */

void test('les deux numéros (appel + WhatsApp) sont proposés avec le message d’aide', () => {
  const sections = read('../components/technician/profil/profile-sections.tsx');
  assert.match(sections, /Numéro d’appel/);
  assert.match(sections, /Numéro WhatsApp/);
  assert.match(
    sections,
    /Si votre numéro d’appel et votre numéro WhatsApp sont identiques/,
  );
});

void test('les numéros sont écrits via /auth/me, pas dupliqués sur le profil', () => {
  assert.match(profilePage, /updateMe/);
  assert.match(profilePage, /whatsapp/);
  // Pas de colonne téléphone ajoutée au TechnicianProfile côté API.
  assert.doesNotMatch(technicianService, /whatsapp\?: string;\s*\n\s*}\s*;/);
});

/* ── §14 / §15 — nature de la pièce et faces attendues ─────────────────── */

void test('CNI exige recto + verso ; passeport une seule page', () => {
  assert.deepEqual(requiredIdentitySides('NATIONAL_ID_CARD'), ['RECTO', 'VERSO']);
  assert.deepEqual(requiredIdentitySides('PASSPORT'), ['SINGLE']);
  // Aucun verso demandé quand la pièce n'en a pas (§15).
  assert.ok(!requiredIdentitySides('PASSPORT').includes('VERSO'));
  // Type non déclaré : aucune face affichée avant le choix de la pièce.
  assert.deepEqual(requiredIdentitySides(null), []);
});

void test('libellés de pièce et d’activité structurés (jamais de texte libre)', () => {
  assert.equal(identityDocumentLabel('NATIONAL_ID_CARD'), 'Carte nationale d’identité');
  assert.equal(identityDocumentLabel('PASSPORT'), 'Passeport');
  assert.equal(identityDocumentLabel(null), null);
  assert.equal(activityTypeLabel('FREELANCE'), 'Freelance / indépendant');
  assert.equal(activityTypeLabel('SALARIED'), 'Salarié');
  assert.equal(activityTypeLabel('COMPANY'), 'Entreprise / atelier');
  assert.equal(activityTypeLabel('OTHER'), 'Autre statut');
  assert.equal(activityTypeLabel(null), null);
});

/* ── §19 — preuve professionnelle facultative ─────────────────────────── */

void test('la preuve professionnelle est facultative et ne bloque pas la soumission', () => {
  assert.match(kycPage, /facultatif/);
  assert.match(kycPage, /n’est jamais exigé/);
  // Le bouton de soumission ne dépend QUE des étapes obligatoires : la
  // condition de désactivation ne doit mentionner ni la preuve pro ni son état.
  const submitDisabled = kycPage.match(
    /disabled=\{([^}]*)\}\s*\n\s*className="w-full"\s*\n\s*size="lg"\s*\n\s*>\s*\n\s*\{status === 'REJECTED'/,
  );
  assert.ok(submitDisabled, 'bouton de soumission trouvé');
  assert.ok(
    !/professional|hasProfessionalProof/i.test(submitDisabled[1]),
    'la preuve pro ne conditionne PAS la soumission',
  );
});

/* ── §7 / §8 — compétences structurées vers le dispatch ────────────────── */

void test('les compétences couvrent catégories ET familles d’équipements', () => {
  assert.match(profilePage, /listEquipmentFamilies/);
  assert.match(profilePage, /familyCodes: skills\.familyCodes/);
  assert.match(profilePage, /categories: skills\.categories/);
  // Les deux niveaux sont envoyés : categories (grossier) + familyCodes (§8).
  assert.match(technicianService, /familyCodes\?: string\[\]/);
});

/* ── §11 — majorité ────────────────────────────────────────────────────── */

void test('calcul d’âge : date complète, jamais « année courante - année de naissance »', () => {
  assert.equal(TECHNICIAN_MINIMUM_AGE, 18);
  // Anniversaire le jour même → accepté.
  assert.equal(computeAge('2007-10-04', new Date('2025-10-04T00:00:00Z')), 18);
  assert.equal(meetsMinimumAge('2007-10-04', new Date('2025-10-04T00:00:00Z')), true);
  // La veille → un an de moins : c'est le test qui distingue la vraie
  // implémentation d'un simple Year - Year.
  assert.equal(computeAge('2007-10-05', new Date('2025-10-04T00:00:00Z')), 17);
  assert.equal(meetsMinimumAge('2007-10-05', new Date('2025-10-04T00:00:00Z')), false);
  // Mois postérieur → un an de moins.
  assert.equal(computeAge('2007-12-31', new Date('2025-10-04T00:00:00Z')), 17);
  // Majeur de longue date.
  assert.equal(meetsMinimumAge('1990-05-20', new Date('2025-10-04T00:00:00Z')), true);
  // Sans date de naissance : jamais « majeur » par défaut.
  assert.equal(meetsMinimumAge(null), false);
  assert.equal(computeAge(null), null);
});

void test('la KYC signale la majorité ET invite les techniciens sans date', () => {
  // Le contrôle d'âge est porté par le composant partagé (IdentitySection),
  // rendu par la page KYC ; le profil, lui, invite à compléter la vérification.
  const sections = read('../components/technician/profil/profile-sections.tsx');
  assert.match(sections, /meetsMinimumAge/);
  assert.match(sections, /18 ans/);
  assert.match(kycPage, /IdentitySection/);
  assert.match(profilePage, /mustCompleteKycProfile/);
  assert.match(profilePage, /Il vous manque votre date de naissance/);
});

/* ── Soumission explicite : le dépôt ne transmet rien ──────────────────── */

void test('le dépôt ne masque pas le parcours : la soumission reste accessible', () => {
  // Si le dépôt faisait passer le statut à PENDING, la section 5 (bouton
  // « Transmettre ») disparaissait dès le premier document : le technicien
  // ne pouvait plus rien transmettre.
  const submitSection = kycPage.match(/\{!awaitingReview \? \([\s\S]*?\) : null\}/);
  assert.ok(submitSection, 'section de soumission conditionnée par awaitingReview');
  assert.match(kycPage, /Transmettre mon dossier/);
  assert.match(kycPage, /submitTechnicianKyc/);
});

void test('le message métier du backend est réellement renvoyé quand il est sûr', () => {
  // Un 400 « Dossier incomplet : renseignez le verso de votre carte
  // nationale » doit être affiché tel quel : c'est l'information qui permet
  // au technicien de corriger.
  const incomplete = Object.assign(new Error('Erreur'), {
    status: 400,
    message: 'Dossier incomplet : renseignez le verso de votre carte nationale.',
  });
  assert.equal(
    toActionableErrorMessage(incomplete, 'fallback'),
    'Dossier incomplet : renseignez le verso de votre carte nationale.',
  );

  // Le message générique ne dit rien de plus : c'est la régression à éviter.
  assert.ok(toUserErrorMessage(incomplete, 'fallback') !== incomplete.message);

  // Un 403 de majorité reste actionnable lui aussi.
  const minor = Object.assign(new Error('Forbidden'), {
    status: 403,
    message: 'Vous devez avoir au moins 18 ans pour exercer comme technicien sur Relio.',
  });
  assert.match(toActionableErrorMessage(minor, 'fallback'), /18 ans/);

  // MAIS le filtre de sécurité reste actif : une stack ou du HTML ne passe pas.
  const leak = Object.assign(new Error('Forbidden'), {
    status: 400,
    message: 'Error: at Foo.bar (/app/dist/main.js:12:3) <script>x</script>',
  });
  const safe = toActionableErrorMessage(leak, 'fallback');
  assert.ok(!safe.includes('script'), 'pas de HTML exposé');
  assert.ok(!safe.includes('/app/dist'), 'pas de stack exposée');
  // Repli sur le sanitizer standard (jamais le message brut).
  assert.equal(safe, toUserErrorMessage(leak, 'fallback'));
});

void test('la progression ne peut pas être indéfinie (currentIndex hors limites)', () => {
  // `indexOf` d'une étape absente renvoie -1 : aucune étape n'apparaîtrait
  // comme faite ni active. L'état terminal doit être clamped à la fin.
  assert.match(kycPage, /awaitingReview \? ALL_STEPS\.length : ALL_STEPS\.indexOf\(currentStep\)/);
});

/* ── §7 — les messages d'erreur exploitables ne sont pas masqués ───────── */

void test('les erreurs KYC affichent le message métier du backend', () => {
  // « Dossier incomplet : renseignez le verso… » est le SEUL retour utile
  // pour corriger ; le masquer derrière un 400 générique est inexploitable.
  assert.match(kycPage, /toActionableErrorMessage/);
  const sanitizer = read('./ui-error-message.ts');
  // Le contournement passe par le MÊME filtre de sécurité, pas par un vide.
  assert.match(sanitizer, /isSafeToDisplay/);
  assert.match(sanitizer, /TECHNICAL_PATTERNS/);
});

/* ── §8 — validation avant envoi ───────────────────────────────────────── */

void test('la page bloque l’envoi sur une saisie invalide', () => {
  const profile = read('../app/technicien/profil/page.tsx');
  assert.match(profile, /experienceYearsInvalid/);
  assert.match(profile, /tooManySpecialties/);
  assert.match(profile, /bioTooLong/);
  // `canSave` doit intégrer ces contrôles, sinon le backend rejette en 400
  // générique sans indiquer le champ fautif.
  assert.match(
    profile,
    /const canSave =[\s\S]{0,300}!experienceYearsInvalid[\s\S]{0,120}!tooManySpecialties/,
  );
});

/* ── §16 / §26 — documents jamais publics ──────────────────────────────── */

void test('aucune URL de document KYC en dur ni stockage public', () => {
  // Les documents passent exclusivement par des URLs signées.
  assert.doesNotMatch(kycPage, /supabase\.co/);
  assert.doesNotMatch(profilePage, /supabase\.co/);
  // Aucune URL permanente de document dans le type API.
  assert.doesNotMatch(technicianService, /documentUrl: string/);
});

/* ── §4 — bio bornée ───────────────────────────────────────────────────── */

void test('la bio est limitée en caractères', () => {
  const sections = read('../components/technician/profil/profile-sections.tsx');
  assert.match(sections, /BIO_MAX_LENGTH = 600/);
  assert.match(sections, /maxLength=\{BIO_MAX_LENGTH\}/);
  assert.match(profilePage, /bio: activity\.bio\.trim\(\) \|\| null/);
});

/* ── §22 — pas de double source de vérité ─────────────────────────────── */

void test('profil et KYC écrivent la même donnée KYC via le même endpoint', () => {
  // Une seule fonction de lecture/écriture pour birthDate/nationality.
  const profileCalls = profilePage.match(/birthDate|nationality/gi) ?? [];
  assert.equal(profileCalls.length, 0, 'le profil ne gère pas ces champs');
  const kycCalls = kycPage.match(/updateTechnicianProfile/g) ?? [];
  assert.ok(kycCalls.length >= 1, 'la page KYC passe par updateTechnicianProfile');
});

/* ── §17 — backoffice : dossier complet en une vue ─────────────────────── */

void test('le dossier admin affiche identité, profil pro, documents et décision', () => {
  const adminPage = read('../app/admin/kyc/[technicianId]/page.tsx');
  const adminService = read('./api/admin-service.ts');
  // Identité servie par l'API…
  for (const field of [
    'birthDate',
    'age',
    'nationality',
    'kycIdentityDocType',
    'whatsapp',
    'activityType',
    'experienceYears',
    'familyCodes',
  ]) {
    assert.match(adminService, new RegExp(`\\b${field}\\b`), `AdminKycDetail.${field}`);
  }
  // …et affichée dans la vue unique.
  for (const needle of ['Identité', 'Profil professionnel', 'Âge', 'WhatsApp']) {
    assert.ok(adminPage.includes(needle), `dossier admin : ${needle}`);
  }
  // La face du document est exposée ET affichée (recto vs verso d'une CNI).
  assert.match(adminService, /side: string/);
  assert.match(adminPage, /kycDocumentSideLabel/);
  // Décision : valider / rejeter avec motif.
  assert.match(adminPage, /updateAdminKycStatus/);
  assert.match(adminPage, /Motif du rejet/);
});

/* ── §23 — pas de doublon fonctionnel côté KYC ────────────────────────── */

void test('aucune ancienne section KYC dans le profil', () => {
  assert.doesNotMatch(profilePage, /KycSection/);
  assert.doesNotMatch(profilePage, /getTechnicianKyc/);
});