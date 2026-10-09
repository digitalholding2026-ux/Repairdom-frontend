import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ONBOARDING_STEP_DEFS } from './technician/onboarding-steps.ts';
import { previewTechnicianQuote } from './technician-quote.ts';

/* Refonte de /devenir-technicien.
 *
 * L'audit précédent a établi trois défauts de FOND, pas de style :
 *
 *   1. la page affichait 8 étapes d'onboarding qui n'existent pas dans le code ;
 *   2. le paiement en était absent ;
 *   3. le barème réel n'y apparaissait pas.
 *
 * Ces tests verrouillent les trois, plus les garde-fous de contenu : aucun
 * chiffre inventé, aucun faux témoignage, aucune promesse non tenue.
 *
 * La lecture est STATIQUE (`readFileSync` + `assert.match`), comme le reste du
 * dépôt : ni jsdom, ni testing-library, ni serveur. Les tests lisent le SOURCE,
 * donc aussi les commentaires — les libellés de cette page sont rédigés en
 * langage métier, jamais avec un nom d'API ou de composant.
 *
 * Les montants ne sont PAS vérifiés par copie littérale du source : ils sont
 * CALCULÉS par `previewTechnicianQuote`, comme la page. Le test vérifie donc
 * « la page suit le barème », et non « la page contient des chiffres figés ».
 */

const APP_ROOT = join(import.meta.dirname, '..', '..');
const readApp = (rel: string): string => readFileSync(join(APP_ROOT, rel), 'utf8');

const page = readApp('src/app/devenir-technicien/page.tsx');
const stats = readApp('src/app/devenir-technicien/recrutement-stats.tsx');
const onboardingSource = readApp('src/lib/technician/onboarding-steps.ts');

/* Fichiers lus par des tests existants : vérifiés ici pour la non-régression
 * croisée, puisque la refonte touche la même route. */
const technicianSplit = readApp('src/components/auth/technician-auth-split.tsx');
const technicianAuthTest = readApp('src/lib/technician-auth.test.ts');

/* `ICON_NAMES` est la SEULE source de vérité des noms d'icônes : c'est le
 * tableau exporté qui alimente le type `IconName`. Le dictionnaire `paths`
 *，更 bas dans le fichier, contient des clés sans apostrophes — lire l'un
 * donnerait un référentiel à 9 entrées et ferait échouer le test à tort. */
const iconSource = readApp('src/components/ui/icon.tsx');
const iconArray = iconSource.match(/export const ICON_NAMES = \[([\s\S]*?)\] as const;/);
assert.ok(iconArray, 'ICON_NAMES introuvable dans icon.tsx');
const validIconNames = new Set(
  Array.from(iconArray[1]!.matchAll(/'([a-z0-9-]+)'/g)).map((m) => m[1]),
);

/* ── 1. Les 4 étapes RÉELLES remplacent les 8 fausses ─────────────────────── */

test('la page affiche les 4 étapes réelles, importées du module d’onboarding', () => {
  /* Importé, pas recopié : un changement de l'ordre de l'onboarding se
   * répercute ici. C'est la correction de fond issue de l'audit. */
  assert.match(page, /from '@\/lib\/technician\/onboarding-steps'/);
  assert.match(page, /ONBOARDING_STEP_DEFS\.map/);
  assert.equal(ONBOARDING_STEP_DEFS.length, 4, 'le module doit toujours définir 4 étapes');
});

test('la page NE contient plus les 8 étapes linéaires de l’ancienne version', () => {
  /* Ces libellés appartenaient au parcours AFFICHÉ, qui n'est pas celui du
   * code. Chacun doit avoir disparu. */
  const obsolete = [
    'Complétez votre profil professionnel',
    'Faites vérifier votre identité',
    'Recevez des demandes correspondant à votre zone',
    'Établissez votre diagnostic',
    'Proposez votre tarif',
    'Réalisez l’intervention',
    'Échangez avec le client',
    'Recevez des demandes correspondant à votre zone et vos compétences',
  ];
  for (const label of obsolete) {
    assert.equal(page.includes(label), false, `« ${label} » ne doit plus figurer sur la page`);
  }
  /* Les trois tableaux de l'ancienne page ont disparu avec leur contenu. */
  assert.equal(/const steps\b/.test(page), false);
  assert.equal(/const benefits\b/.test(page), false);
  assert.equal(/const requirements\b/.test(page), false);
  assert.equal(/const framework\b/.test(page), false);
});

test('les étapes affichées pointent vers les vraies routes technicien', () => {
  const hrefs = new Set(ONBOARDING_STEP_DEFS.map((step) => step.href));
  for (const route of ['/technicien/profil', '/technicien/kyc', '/technicien/zones']) {
    assert.equal(hrefs.has(route), true, `${route} doit figurer dans les étapes`);
  }
  /* Chaque étape a son CTA « Commencer » vers SA route. */
  assert.match(page, /Commencer/);
  assert.match(page, /href=\{step\.href\}/);
});

test('le module d’onboarding reste la source de vérité du parcours', () => {
  assert.match(onboardingSource, /id: 'profile'[\s\S]*href: '\/technicien\/profil'/);
  assert.match(onboardingSource, /id: 'kyc'[\s\S]*href: '\/technicien\/kyc'/);
  assert.match(onboardingSource, /id: 'zones'[\s\S]*href: '\/technicien\/zones'/);
  assert.match(onboardingSource, /id: 'available'/);
});

/* ── 2. Le paiement est présent ET mis en valeur ─────────────────────────── */

test('le paiement est présent trois fois, dont une mise en valeur', () => {
  /* Étape métier n° 4 de la section « Une intervention, concrètement ». */
  assert.match(page, /Paiement après validation/);
  assert.match(page, /Vous êtes payé une fois l’intervention validée par le client/);
  /* Argument à part entière dans la section « Pourquoi rejoindre ». */
  assert.match(page, /Paiement garanti après validation/);
  /* ET isolé visuellement : c'est la question n° 1 d'un technicien candidat,
   * un simple item dans une liste ne suffirait pas. */
  assert.match(page, /highlighted: true/);
  assert.match(page, /step\.highlighted \?/);
});

/* ── 3. Le barème vient du code, jamais du source ─────────────────────────── */

test('le tableau des montants est CALCULÉ, jamais écrit en dur', () => {
  assert.match(page, /previewTechnicianQuote/);
  assert.match(page, /from '@\/lib\/technician-quote'/);
  assert.match(page, /formatFCFA/);
  /* Seuls les devis d'exemple sont des littéraux ; les nets, jamais. */
  assert.match(page, /const QUOTE_AMOUNTS_XAF = \[5_000, 10_000, 15_000, 25_000\]/);
  assert.equal(/previewTechnicianQuote\(5_000\)/.test(page), false);
});

test('le libellé du barème vient de TECHNICIAN_FEE_LABEL, jamais recopié', () => {
  assert.match(page, /TECHNICIAN_FEE_LABEL/);
  /* Une redite littérale du barème créerait un second point de vérité. */
  assert.equal(/500 FCFA \+ 4\s*%/.test(page), false);
  assert.equal(/4\s*%/.test(page), false);
});

test('la mention des frais de transfert est la mention partagée', () => {
  assert.match(page, /relioAbsorbsTransferFeesNote/);
  assert.match(page, /saspay-relio-absorbs-fees/);
  /* Aucun taux de frais côté technicien : il n'a rien à calculer. */
  assert.equal(/0\.045|4,5\s*%|brutEnvoye|chargedAmount|fraisSaspay/i.test(page), false);
});

/* ── 4. Les 4 montants du tableau reflètent le VRAI barème ────────────────── */

test('les 4 montants du tableau sont ceux du barème en vigueur', () => {
  /* Recalculés ici avec la même fonction que la page : si le barème change,
   * c'est CE TEST qui échoue, pas la page en silence. */
  const expected: Array<[number, number]> = [
    [5_000, 6_300],
    [10_000, 11_100],
    [15_000, 15_900],
    [25_000, 25_500],
  ];
  for (const [quote, net] of expected) {
    const preview = previewTechnicianQuote(quote);
    assert.equal(preview.net, net, `net attendu ${net} pour un devis de ${quote}`);
    /* Et la formule reste devis + transport − commission. */
    assert.equal(preview.net, quote + 2_000 - preview.commission);
  }
});

test('le tableau ne propose que des devis autorisés', () => {
  for (const quote of [5_000, 10_000, 15_000, 25_000]) {
    assert.equal(previewTechnicianQuote(quote).allowed, true, `${quote} doit être proposable`);
  }
});

/* ── 5. Garde-fous : rien d’inventé ───────────────────────────────────────── */

test('la page n’invente aucun chiffre', () => {
  /* Aucun décompte de techniciens, de clients, de missions, de revenu moyen ni
   * de note moyenne : aucun endpoint public ne les expose. */
  const forbidden = [
    /\d[\d\s.,]*\s?techniciens/i,
    /\d[\d\s.,]*\s?clients/i,
    /\d[\d\s.,]*\s?missions (?:réalisées|effectuées)/i,
    /revenu moyen/i,
    /note moyenne/i,
    /\d+\s?% de satisfaction/i,
    /\d[\d\s.,]*\s?avis/i,
    /\d[\d\s.,]*\s?étoiles/i,
  ];
  for (const pattern of forbidden) {
    assert.equal(pattern.test(page), false, `motif interdit trouvé : ${pattern}`);
  }
});

test('la page n’annonce aucun délai de traitement ni volume minimal', () => {
  /* Un délai annoncé non tenu est la promesse la plus coûteuse qu'une page de
   * recrutement puisse faire. Le module d'onboarding n'en contient aucun. */
  assert.equal(/sous \d+\s?(?:h\b|heures|jours)/i.test(page), false);
  assert.equal(/\b\d+\s?missions (?:par|minimum)/i.test(page), false);
});

test('la page ne promet ni formation, ni mentorat, ni revenu garanti', () => {
  /* Comparaison par MOT ENTIER, pas par sous-chaîne : « information »
   * contient « formation », et « l'information » apparaît légitimement dans
   * un commentaire. Un `includes` naïf ferait échouer ce test à tort — il
   * testerait la faute de frappe du test, pas la promesse interdite. */
  const forbidden = [
    /\bformation\b/i,
    /\bmentorat\b/i,
    /\bmentor\b/i,
    /\brevenu garanti\b/i,
    /\bgarantie de revenu\b/i,
  ];
  for (const pattern of forbidden) {
    assert.equal(pattern.test(page), false, `${pattern} promet un avantage qui n'existe pas`);
  }
});

test('la page ne cite aucun programme de récompenses technicien', () => {
  /* Il n'existe pas côté technicien : le programme est côté client. */
  assert.equal(/programme de récompenses/i.test(page), false);
});

test('la page n’affiche aucun témoignage', () => {
  /* Aucun n'existe dans le produit, et la landing a supprimé les siens
   * (faux avis). Un témoignage d'invention serait le même mensonge. */
  /* Mots entiers uniquement : « avis de » apparaît dans une phrase anodine
   * du commentaire d'en-tête. Ce qui est surveillé, c'est un avis cité, pas la
   * locution. */
  for (const pattern of [/\btémoignages?\b/i, /\bavis de clients?\b/i, /★/]) {
    assert.equal(pattern.test(page), false, `${pattern} interdit sur une page de recrutement`);
  }
});

/* ── 6. Les preuves sociales viennent de GET /cities ─────────────────────── */

test('la section des chiffres suit le pattern de masquage à l’échec', () => {
  /* Fragment client isolé : la page reste un Server Component. */
  assert.match(stats, /^'use client';/);
  assert.match(page, /from '\.\/recrutement-stats'/);
  assert.match(page, /RecrutementStats/);
  /* Source unique : l'endpoint public des villes, comme la landing. */
  assert.match(stats, /listCities/);
  assert.match(stats, /cities-service/);
  /* Masquage à l'échec, sans repli chiffré. */
  assert.match(stats, /if \(!stats\) return null/);
  assert.match(stats, /cities\.length === 0/);
  assert.match(stats, /\.catch\(/);
  /* Aucun squelette figé avec des valeurs par défaut : le rendu suit la garde. */
  assert.match(stats, /if \(!stats\) return null;[\s\S]*<dl/);
  assert.equal(/'0'|value: '—'/.test(stats), false);
});

test('les 2 indicateurs sont villes + zones, zones étant la somme des villes', () => {
  assert.match(stats, /Villes couvertes/);
  assert.match(stats, /Zones couvertes/);
  assert.match(stats, /reduce\(\(sum, city\) => sum \+ \(city\.zones\?\.length \?\? 0\), 0\)/);
});

/* ── 7. Icônes : toutes valides ───────────────────────────────────────────── */

test('toutes les icônes utilisées existent dans icon.tsx', () => {
  assert.ok(
    validIconNames.size >= 40,
    `référentiel d'icônes suspect : ${validIconNames.size} entrées`,
  );

  const used = new Set<string>();
  for (const source of [page, stats]) {
    for (const m of source.matchAll(/icon:\s*'([a-z0-9-]+)'/g)) used.add(m[1]);
    for (const m of source.matchAll(/<Icon\s+name="([a-z0-9-]+)"/g)) used.add(m[1]);
  }

  assert.ok(used.size > 0, 'aucune icône détectée — le test ne servirait à rien');
  for (const name of used) {
    assert.equal(validIconNames.has(name), true, `nom d'icône inexistant : « ${name} »`);
  }
});

/* ── 8. Les 10 sections, dans l’ordre ─────────────────────────────────────── */

test('les 10 sections sont présentes et dans l’ordre', () => {
  /* La 2ᵉ section (les chiffres) vit dans le fragment client : son titre n'est
   * donc pas dans `page`. On cherche chaque section là où elle est réellement
   * écrite, puis on vérifie l'ordre d'INSERTION dans la page — c'est l'ordre
   * affiché qui compte, pas l'emplacement du titre. */
  const expected: Array<{ label: string; source: 'page' | 'stats'; pattern: RegExp }> = [
    { label: '1. Hero', source: 'page', pattern: /Devenez technicien Relio/ },
    { label: '2. Chiffres', source: 'stats', pattern: /Relio en chiffres/ },
    { label: '3. Parcours', source: 'page', pattern: /Votre parcours pour rejoindre Relio/ },
    { label: '4. Intervention', source: 'page', pattern: /Une intervention, concrètement/ },
    { label: '5. Arguments', source: 'page', pattern: /Pourquoi rejoindre Relio/ },
    { label: '6. Barème', source: 'page', pattern: /Combien vous pouvez gagner/ },
    { label: '7. Sélectivité', source: 'page', pattern: /attend de vous/ },
    { label: '8. Engagement', source: 'page', pattern: /Notre engagement envers vous/ },
    { label: '9. FAQ', source: 'page', pattern: /Questions fréquentes/ },
    { label: '10. CTA final', source: 'page', pattern: /Prêt à rejoindre Relio/ },
  ];

  for (const { label, source, pattern } of expected) {
    const haystack = source === 'stats' ? stats : page;
    assert.ok(haystack.match(pattern), `section absente : ${label}`);
  }

  /* Ordre d'insertion des sectionsrenders dans la page. Le fragment des
   * chiffres est monté par une balise dédiée : sa position se lit donc dans
   * `page` comme les autres. */
  /* L'ORDRE AFFICHÉ se lit sur les ancres de section, pas sur les titres : un
   * titre cité dans le commentaire d'en-tête apparaît en haut du fichier et
   * fausserait la mesure. `aria-labelledby` et la balise de montage sont
   * uniques : elles reflètent exactement l'ordre du JSX rendu. */
  const insertions: Array<[string, string]> = [
    ['1. Hero', '<h1'],
    ['2. Chiffres', '<RecrutementStats'],
    ['3. Parcours', 'aria-labelledby="parcours-title"'],
    ['4. Intervention', 'aria-labelledby="mission-title"'],
    ['5. Arguments', 'aria-labelledby="arguments-title"'],
    ['6. Barème', 'aria-labelledby="tarifs-title"'],
    ['7. Sélectivité', 'aria-labelledby="attentes-title"'],
    ['8. Engagement', 'aria-labelledby="engagement-title"'],
    ['9. FAQ', 'aria-labelledby="faq-technicien-title"'],
    ['10. CTA final', 'Inscription gratuite. Aucun engagement.'],
  ];

  let previous = -1;
  for (const [label, needle] of insertions) {
    const at = page.indexOf(needle);
    assert.notEqual(at, -1, `ancre de section absente : ${label}`);
    assert.ok(at > previous, `« ${label} » n'est pas dans l'ordre attendu`);
    previous = at;
  }
});

/* ── 9. Responsive : le tableau devient des cartes ───────────────────────── */

test('le tableau est doublé d’une version en cartes pour mobile', () => {
  /* Un tableau à 2 colonnes ne se lit pas sur 375 px. Les deux rendus
   * existent : `hidden … sm:table` et `sm:hidden`.
   *
   * L'INTENTION est vérifiée, pas la classe exacte : une assertion sur la
   * chaîne complète interdisait toute retouche d'espacement ou de rayon, et
   * figeait ces deux blocs en dehors du rythme des huit autres sections.
   * Ce qui compte reste : la bascule mobile, la grille, et le fait que les
   * deux rendus lisent la même source. */
  assert.match(
    page,
    /<table[^>]*\bhidden\b[^>]*\bborder-collapse\b[^>]*\bsm:table\b[^>]*>/,
    'le tableau doit rester masqué sur mobile et s’afficher dès sm',
  );
  assert.match(
    page,
    /<ul[^>]*\bsm:hidden\b[^>]*>/,
    'la version en cartes doit rester masquée dès sm',
  );
  /* Et les deux lisent la MÊME source : pas de divergence possible. */
  assert.equal(
    (page.match(/QUOTE_AMOUNTS_XAF\.map/g) ?? []).length,
    2,
    'tableau et cartes doivent partager la même source',
  );
});

/* ── 10. CTA factorisés et non-régression ────────────────────────────────── */

test('les CTA sont factorisés, pas répétés en dur', () => {
  /* L'audit relevait deux libellés identiques écrits en dur à deux endroits. */
  assert.match(page, /const SIGNUP_LABEL = 'Devenir technicien'/);
  assert.match(page, /const SIGNUP_HREF = '\/technicien\/inscription'/);
  assert.equal(/Devenir technicien<\/Button>/.test(page), false);
  assert.equal(/href="\/technicien\/inscription"/.test(page), false);
  assert.equal((page.match(/href=\{SIGNUP_HREF\}/g) ?? []).length, 2);
  assert.equal((page.match(/href=\{SIGNIN_HREF\}/g) ?? []).length, 2);
});

test('la page reste un Server Component', () => {
  assert.equal(/^\s*'use client'/m.test(page), false);
  assert.match(page, /export const metadata: Metadata/);
});

test('non-régression : le tunnel d’inscription pointe toujours vers la page', () => {
  /* `technician-auth.test.ts:192` verrouille ce lien. La refonte ne doit ni
   * avoir touché le composant, ni avoir rendu le test faux.
   *
   * On cherche la destination, sans exiger la forme littérale : dans le test
   * existant la chaîne est écrite dans une regex (`/\'/devenir-technicien\'/`),
   * donc avec un antislash qu'un `assert.match` sur `'\/devenir-technicien'`
   * ne retrouve pas. */
  assert.match(technicianSplit, /\/devenir-technicien/);
  assert.match(technicianAuthTest, /\/devenir-technicien/);
});
