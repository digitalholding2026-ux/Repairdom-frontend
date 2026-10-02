/* Garde-fou cross-domain (P0 résolu) : aucun middleware basé cookie.
 *
 * Contexte : frontend Vercel (`www.relioo.space`) + backend Railway
 * (domaine distinct) = cross-site. Le cookie `repairdom_token` posé par
 * Railway n'est JAMAIS visible par un `middleware.ts` Vercel : tout
 * middleware qui le lit redirige 100 % des connectés vers /connexion.
 * Voir `frontend/ARCHITECTURE.md` (« Pourquoi il n'y a PAS de
 * middleware.ts »). Protection officielle : RoleGuard + GET /auth/me.
 *   node --test src/lib/no-middleware.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../', import.meta.url));

void test('aucun middleware.ts à la racine de src/', () => {
  for (const file of ['middleware.ts', 'middleware.js']) {
    const found = existsSync(join(SRC, file));
    assert.equal(
      found,
      false,
      'middleware.ts détecté. Un middleware ne peut pas fonctionner dans cette ' +
        "architecture cross-domain (Vercel + Railway). Lire frontend/ARCHITECTURE.md avant de le " +
        'réintroduire. Si tu veux vraiment le réintroduire, tu dois d’abord migrer le backend ' +
        'sur api.relioo.space et mettre à jour ce test ET ARCHITECTURE.md.',
    );
  }
});

void test('repairdom_token jamais lu directement côté frontend', () => {
  // Seule lecture autorisée : le navigateur envoie le cookie vers Railway
  // via fetch + credentials:'include' (contrats dans lib/api/*). Toute
  // lecture directe (document.cookie, cookies() de next/headers) est un
  // signe de bug : le cookie appartient à un autre domaine.
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === 'node_modules' || entry === '.next') continue;
        walk(full, out);
      } else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
        if (full.endsWith('.test.ts')) continue;
        out.push(full);
      }
    }
    return out;
  };
  const offenders: string[] = [];
  for (const file of walk(SRC)) {
    const content = readFileSync(file, 'utf8');
    if (
      content.includes('document.cookie') ||
      /from 'next\/headers'/.test(content) ||
      /require\('next\/headers'\)/.test(content)
    ) {
      offenders.push(file);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `Lecture directe du cookie détectée (interdite en cross-domain) : ${offenders.join(', ')}. ` +
      'Le frontend ne doit lire repairdom_token que via fetch credentials:include. ' +
      'Voir frontend/ARCHITECTURE.md.',
  );
});
