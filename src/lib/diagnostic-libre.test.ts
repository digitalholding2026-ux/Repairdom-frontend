/* IA-3 — diagnostic libre du technicien : formulaire unifié, audio, prix.
 *
 * Exécuté avec Node 24 natif (type stripping, zéro dépendance) :
 *   node --test src/lib/diagnostic-libre.test.ts
 * ou : npm run test:unit
 * Vérifications statiques (jamais bundlé, exclu du tsconfig Next).
 * Aucun appel IA, catalogue non requis, source MANUAL préservée.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel: string): string =>
  readFileSync(new URL(rel, import.meta.url), 'utf8');

void test('flux unifié : diagnostic → explication → voix → prix → devis MANUAL', () => {
  const hook = read('../components/technician/diagnostic/use-free-diagnostic.ts');
  assert.match(hook, /uploadDiagnosticAudio/);
  assert.match(hook, /selectDemandeDiagnostic/);
  assert.match(hook, /createDemandeQuote/);
  assert.match(hook, /mode: 'MANUAL'/);
  assert.doesNotMatch(hook, /CATALOG/);
  assert.doesNotMatch(hook, /AiGateway|OpenRouter|openrouter/i);
  // Ordre imposé : audio d'abord, diagnostic ensuite, devis enfin.
  const uploadAt = hook.indexOf('uploadDiagnosticAudio(');
  const selectAt = hook.indexOf('selectDemandeDiagnostic(');
  const quoteAt = hook.indexOf('createDemandeQuote(');
  assert.ok(uploadAt < selectAt && selectAt < quoteAt);
});

void test('validation : diagnostic ≥10, prix entier XAF, orphelin nettoyé si non lié', () => {
  const hook = read('../components/technician/diagnostic/use-free-diagnostic.ts');
  assert.match(hook, /FREE_DIAGNOSTIC_MIN_LENGTH = 10/);
  assert.match(hook, /diagnosticLinked/);
  assert.match(hook, /deleteDiagnosticAudio/);
  /* Chantier 4-FONDATIONS-A : le contrôle « entier XAF » (et le seuil de
   * 5 000 FCFA) n'est plus écrit dans le hook mais délégué à la source unique
   * `@/lib/technician-quote`, également utilisée par le formulaire de devis
   * simple. C'est ce module qui porte désormais `Number.isInteger`. */
  assert.match(hook, /import \{ quoteAmountError \} from '@\/lib\/technician-quote'/);
  assert.match(hook, /const parsedQuote = quoteAmountError\(amount\)/);
  const shared = read('./technician-quote.ts');
  assert.match(shared, /Number\.isInteger/);
  assert.match(shared, /MIN_QUOTE_AMOUNT_XAF = 5_000/);
});

void test('vues isolées Desktop/Mobile, mêmes appels, voix réutilisée', () => {
  for (const rel of [
    '../components/technician/diagnostic/free-diagnostic-desktop-view.tsx',
    '../components/technician/diagnostic/free-diagnostic-mobile-view.tsx',
  ]) {
    const view = read(rel);
    assert.match(view, /VoiceRecorder/);
    assert.match(view, /Prix proposé/);
    assert.match(view, /Diagnostic principal/);
    assert.match(view, /Envoyer le diagnostic et le devis/);
  }
  const desktop = read('../components/technician/diagnostic/free-diagnostic-desktop-view.tsx');
  assert.match(desktop, /grid-cols-2/);
  const mobile = read('../components/technician/diagnostic/free-diagnostic-mobile-view.tsx');
  assert.match(mobile, /min-h-12/);
  assert.doesNotMatch(mobile, /grid-cols-2/);
  const section = read('../components/technician/diagnostic/free-diagnostic-section.tsx');
  assert.match(section, /ResponsiveView/);
  const page = read('../app/technicien/demandes/[id]/page.tsx');
  assert.match(page, /FreeDiagnosticSection/);
});

void test('audio : player lazy des deux côtés, backend inchangé sinon', () => {
  const player = read('../components/mission/diagnostic-audio-player.tsx');
  assert.match(player, /<audio\s+controls/);
  assert.match(player, /preload="metadata"/);
  assert.match(player, /aria-label/);
  const tech = read('../app/technicien/demandes/[id]/page.tsx');
  assert.match(tech, /DiagnosticAudioPlayer/);
  assert.match(tech, /getDiagnosticAudioUrl/);
  const client = read('../app/client/demandes/[id]/page.tsx');
  assert.match(client, /DiagnosticAudioPlayer/);
  const service = read('./api/technician-service.ts');
  assert.match(service, /hasAudio/);
  assert.match(service, /audioStoragePath/);
  assert.match(service, /uploadDiagnosticAudio/);
  assert.match(service, /getDiagnosticAudioUrl/);
});

void test('catalogue existant intact : hub supprimé, devis/negociation préservés', () => {
  const page = read('../app/technicien/demandes/[id]/page.tsx');
  // Le cadre « Choisir un diagnostic » (catalogue + manuel séparé) est
  // supprimé au profit du flux libre unifié ; backend et devis intacts.
  assert.doesNotMatch(page, /Choisir un diagnostic/);
  assert.doesNotMatch(page, /showManualCatForm/);
  assert.doesNotMatch(page, /getDemandeSuggestions/);
  assert.match(page, /FreeDiagnosticSection/);
  assert.match(page, /canProposeManualQuote/);
});
