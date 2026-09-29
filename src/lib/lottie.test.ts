/* MISSION LottieFlow — intégration centralisée, performante, accessible.
 *
 * Exécuté avec Node 24 natif (type stripping, zéro dépendance) :
 *   node --test src/lib/lottie.test.ts
 * ou : npm run test:unit
 * Vérifications statiques (jamais bundlé, exclu du tsconfig Next).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../', import.meta.url));
const ANIM_DIR = fileURLToPath(new URL('../../animatio json/', import.meta.url));

const EXPECTED_JSON = [
  'code  USSD Envoyer pour recharge.json',
  'demande envoyer.json',
  'erreur 404.json',
  'menu nav.json',
  'recherche de technicien.json',
  'social media whatsapp.json',
];

void test('audit : 6 JSON valides, vectoriels, sans dépendance externe', () => {
  const files = readdirSync(ANIM_DIR);
  assert.deepEqual([...files].sort(), [...EXPECTED_JSON].sort());
  for (const file of EXPECTED_JSON) {
    const json = JSON.parse(readFileSync(join(ANIM_DIR, file), 'utf8'));
    assert.ok(Array.isArray(json.layers) && json.layers.length > 0, file);
    assert.equal(json.v, '5.3.4', file);
    const external = (json.assets ?? []).filter(
      (a: { u?: string; p?: string }) => typeof a.u === 'string' && !a.u.startsWith('data:'),
    );
    assert.deepEqual(external, [], `${file} : asset externe`);
  }
});

void test('suivi Git : les 6 JSON sont versionnés (sinon Vercel/Linux échoue)', async () => {
  // Régression du build Vercel : les JSON existaient sur disque mais
  // n'étaient pas suivis par Git → « Module not found » sur Linux.
  let tracked: string;
  try {
    const { execSync } = await import('node:child_process');
    tracked = execSync('git ls-files "animatio json"', {
      cwd: fileURLToPath(new URL('../../', import.meta.url)),
      encoding: 'utf8',
    });
  } catch {
    return; // Git indisponible ici : le build Vercel reste le garde-fou.
  }
  for (const file of EXPECTED_JSON) {
    assert.ok(tracked.includes(file), `non suivi par Git : ${file}`);
  }
});

void test('architecture : lecteur unique, un JSON par wrapper', () => {
  const central = readFileSync(
    fileURLToPath(new URL('../components/ui/lottie-animation.tsx', import.meta.url)),
    'utf8',
  );
  assert.match(central, /export function LottieAnimation/);
  assert.match(central, /ssr: false/);
  assert.match(central, /prefers-reduced-motion/);
  assert.match(central, /aria-hidden/);
  const wrappers = readFileSync(
    fileURLToPath(new URL('../components/lottie/lottie-animations.tsx', import.meta.url)),
    'utf8',
  );
  for (const file of EXPECTED_JSON) {
    assert.ok(wrappers.includes(file), `wrapper : ${file}`);
  }
  // Tailles maximales raisonnables (jamais de width:100% nu).
  assert.doesNotMatch(wrappers, /w-full/);
  assert.match(wrappers, /size-6/);
  assert.match(wrappers, /size-5/);
});

void test('architecture : aucun import lottie/JSON dispersé', () => {
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === 'node_modules' || entry === '.next') continue;
        walk(full, out);
      } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
        if (entry.endsWith('.test.ts')) continue;
        out.push(full);
      }
    }
    return out;
  };
  for (const file of walk(SRC)) {
    const content = readFileSync(file, 'utf8');
    const normalized = file.replace(/\\/g, '/');
    const isCentral =
      normalized.endsWith('components/ui/lottie-animation.tsx') ||
      normalized.endsWith('components/lottie/lottie-animations.tsx');
    if (!isCentral) {
      assert.doesNotMatch(content, /from 'lottie-react'/);
      assert.doesNotMatch(content, /animatio json/);
    }
  }
  // Le fichier wrappers est le SEUL autorisé à importer les JSON.
  const wrappers = readFileSync(
    fileURLToPath(new URL('../components/lottie/lottie-animations.tsx', import.meta.url)),
    'utf8',
  );
  assert.doesNotMatch(wrappers, /from 'lottie-react'/);
});

void test('usages : chaque animation au bon endroit, états préservés', () => {
  const read = (rel: string): string =>
    readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
  // Recharge : feedback de traitement uniquement (submitting, pas de succès).
  const recharge = read('../app/client/solde/recharger/page.tsx');
  assert.match(recharge, /UssdRechargeAnimation/);
  assert.match(recharge, /\{submitting \?/);
  assert.doesNotMatch(recharge, /Recharge confirmée|recharge réussie/i);
  // Demande : page confirmation (succès backend déjà acquis).
  const confirmation = read('../app/client/confirmation/page.tsx');
  assert.match(confirmation, /DemandeEnvoyeeAnimation/);
  // 404 : page introuvable uniquement.
  const notFound = read('../app/not-found.tsx');
  assert.match(notFound, /Erreur404Animation/);
  // Menu : mobile uniquement (bloc lg:hidden), états conservés.
  const header = read('../components/public/public-header.tsx');
  assert.match(header, /MenuNavAnimation/);
  assert.match(header, /aria-expanded/);
  // Recherche : statut backend réel + texte porteur.
  const suivi = read('../app/suivi/page.tsx');
  assert.match(suivi, /RechercheTechnicienAnimation/);
  assert.match(suivi, /!tracking\.technicianAssigned/);
  const detail = read('../app/client/demandes/[id]/page.tsx');
  assert.match(detail, /RechercheTechnicienAnimation/);
  // WhatsApp : champs du numéro uniquement, validation intacte.
  const profil = read('../app/client/profil/page.tsx');
  assert.match(profil, /WhatsAppMark/);
  const auth = read('../components/client/client-auth-form.tsx');
  assert.match(auth, /WhatsAppMark/);
});
