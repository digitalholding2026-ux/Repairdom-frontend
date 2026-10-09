/* TRANSPARENCE SASPAY — verrous des règles métier des frais SasPay.
 *
 * Ce test couvre les DEUX faces du chantier :
 *
 *   côté CLIENT — la transparence (les 4,5 % sont annoncés AVANT validation,
 *     alignés sur la formule backend) ;
 *   côté TECHNICIEN — l'Option A (le net affiché est le net encaissé, et AUCUN
 *     montant de frais ne lui est exposé).
 *
 * Il verrouille aussi l'absence de frais SasPay sur les écrans de MISSION
 * client : il n'en existe pas, et afficher un montant que le client ne paie
 * pas serait exactement l'inverse de la transparence recherchée.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  SASPAY_COLLECT_FEE_LABEL,
  SASPAY_COLLECT_RATE,
  computeSaspayCollectFee,
  computeSaspayCollectTotal,
  previewTopupFees,
} from './saspay-fees.ts';
import {
  RELIO_ABSORBS_FEES_NOTE,
  relioAbsorbsTransferFeesNote,
} from './saspay-relio-absorbs-fees.ts';
import { formatFCFA } from './format-fcfa.ts';

/* `src/lib/` → racine du dépôt frontend. */
const SRC = join(import.meta.dirname);
const APP_ROOT = join(SRC, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(APP_ROOT, relativePath), 'utf8');
}

/* ── CLIENT — transparence de la recharge ───────────────────────────────── */

describe('recharge client : les 4,5 % sont annoncés avant validation', () => {
  it('le taux est celui mesuré en production', () => {
    assert.equal(SASPAY_COLLECT_RATE, 0.045);
  });

  it('les frais suivent ceil(montant × 0,045)', () => {
    assert.equal(computeSaspayCollectFee(2_000), 90);
    assert.equal(computeSaspayCollectFee(100), 5);
    assert.equal(computeSaspayCollectFee(5_000), 225);
    assert.equal(computeSaspayCollectFee(10_000), 450);
    assert.equal(computeSaspayCollectFee(25_000), 1_125);
  });

  it('exemples canoniques (mesures de production)', () => {
    // 2 000 → SasPay débite 2 090, Relio crédite 2 000.
    assert.equal(computeSaspayCollectTotal(2_000), 2_090);
  });

  it('l’arrondi est au XAF supérieur : le total n’est jamais sous-annoncé', () => {
    for (const amount of [100, 101, 555, 2_000, 4_999, 10_000, 10_000_000]) {
      const fee = computeSaspayCollectFee(amount);
      assert.ok(Number.isInteger(fee));
      assert.ok(fee >= amount * SASPAY_COLLECT_RATE, `frais sous le taux pour ${amount}`);
      assert.ok(fee < amount * SASPAY_COLLECT_RATE + 1, `frais trop hauts pour ${amount}`);
      assert.equal(computeSaspayCollectTotal(amount), amount + fee);
    }
  });

  it('l’aperçu expose les trois lignes : montant, frais, total', () => {
    const preview = previewTopupFees(2_000);
    assert.deepEqual(preview, {
      credited: 2_000,
      fee: 90,
      totalToPay: 2_090,
      valid: true,
    });
  });

  it('un montant invalide neutralise l’aperçu (jamais de total annoncé à tort)', () => {
    for (const bad of [0, -1, 12.5, Number.NaN]) {
      const preview = previewTopupFees(bad);
      assert.equal(preview.valid, false);
      assert.equal(preview.credited, 0);
      assert.equal(preview.fee, 0);
      assert.equal(preview.totalToPay, 0);
    }
  });

  it('l’intitulé du poste de frais nomme le taux affiché', () => {
    assert.match(SASPAY_COLLECT_FEE_LABEL, /4,5/);
    assert.match(SASPAY_COLLECT_FEE_LABEL, /Mobile Money/);
  });

it('les montants de l’aperçu passent par formatFCFA', () => {
    const NBSP = String.fromCharCode(160); // insécable, comme formatFCFA
    assert.equal(formatFCFA(previewTopupFees(2_000).totalToPay), `2${NBSP}090 FCFA`);
    assert.equal(formatFCFA(previewTopupFees(2_000).fee), `90 FCFA`);
    assert.equal(
      formatFCFA(previewTopupFees(1_234_567).totalToPay),
      `1${NBSP}290${NBSP}123 FCFA`,
    );
  });
});

describe('écran de recharge : les trois lignes sont bien présentes', () => {
  const source = readSource('src/app/client/solde/recharger/page.tsx');

  it('importe l’aperçu de frais et son intitulé', () => {
    assert.match(source, /from '@\/lib\/saspay-fees'/);
    assert.match(source, /SASPAY_COLLECT_FEE_LABEL/);
    assert.match(source, /previewTopupFees/);
  });

  it('affiche « Montant rechargé », « Frais… » et « Total à payer »', () => {
    assert.match(source, /Montant rechargé/);
    assert.match(source, /Total à payer/);
    // L'intitulé des frais vient de la constante, pas d'un littéral dupliqué.
    assert.match(source, /\{SASPAY_COLLECT_FEE_LABEL\}/);
  });

  it('le bouton de paiement annonce le TOTAL, pas le seul montant saisi', () => {
    assert.match(source, /Confirmer et payer/);
    assert.match(source, /totalToPay/);
  });
});

describe('écran de résultat de recharge : le total payé est affiché', () => {
  const source = readSource('src/app/client/solde/recharge/result/page.tsx');

  it('distingue le solde crédité du total payé', () => {
    assert.match(source, /Solde crédité/);
    assert.match(source, /Total payé/);
  });

  it('reste aligné sur l’aperçu (mêmes formules)', () => {
    assert.match(source, /computeSaspayCollectFee/);
    assert.match(source, /from '@\/lib\/saspay-fees'/);
  });
});

/* ── CLIENT — aucune mention de frais sur une MISSION ───────────────────── */

describe('missions client : aucun frais SasPay (ils n’existent pas)', () => {
  const source = readSource('src/app/client/demandes/[id]/page.tsx');

  it('l’écran de mission ne mentionne ni SasPay ni de frais de transaction', () => {
    assert.equal(/saspay/i.test(source), false);
    assert.equal(/frais de transaction/i.test(source), false);
    assert.equal(/frais mobile money/i.test(source), false);
  });

  it('le récap client reste réparation + transport + total', () => {
    assert.match(source, /totalToDebit/);
  });

  it('la phrase « frais pris en charge par Relio » n’y apparaît pas', () => {
    // C’est une mentionTechnicien : elle n'a rien à faire côté client mission.
    assert.equal(source.includes(RELIO_ABSORBS_FEES_NOTE), false);
  });
});

/* ── TECHNICIEN — Option A ──────────────────────────────────────────────── */

describe('technicien : la mention « pris en charge par Relio » est partagée', () => {
  it('a exactement la formulation attendue', () => {
    assert.equal(RELIO_ABSORBS_FEES_NOTE, 'Frais de transfert Mobile Money pris en charge par Relio.');
  });

  it('les trois contextes d’affichage partagent la même mention', () => {
    assert.equal(relioAbsorbsTransferFeesNote('mission'), RELIO_ABSORBS_FEES_NOTE);
    assert.equal(relioAbsorbsTransferFeesNote('retrait'), RELIO_ABSORBS_FEES_NOTE);
    assert.equal(relioAbsorbsTransferFeesNote('apercu-devis'), RELIO_ABSORBS_FEES_NOTE);
  });

  it('ne contient AUCUN montant (le technicien n’a pas à savoir le coût)', () => {
    assert.equal(/\d/.test(RELIO_ABSORBS_FEES_NOTE), false);
    assert.equal(/FCFA|XAF/i.test(RELIO_ABSORBS_FEES_NOTE), false);
  });

  it('le module n’expose ni taux ni formule de frais au technicien', () => {
    const source = readFileSync(join(SRC, 'saspay-relio-absorbs-fees.ts'), 'utf8');
    // Aucun taux de 3,5 % dans le module côté technicien : il n'a rien à
    // calculer, seulement une mention à afficher.
    assert.equal(/0\.035|3,5|3\.5/.test(source), false);
  });
});

describe('écrans technicien : la mention est présente, les frais jamais chiffrés', () => {
  const targets = [
    ['src/app/technicien/demandes/[id]/page.tsx', 'détail mission'],
    ['src/app/technicien/revenus/page.tsx', 'revenus'],
    ['src/components/finance/withdrawal-panel.tsx', 'demande de retrait'],
  ] as const;

  for (const [path, label] of targets) {
    it(`${label} : importe et affiche la mention partagée`, () => {
      const source = readSource(path);
      assert.match(source, /relioAbsorbsTransferFeesNote|RELIO_ABSORBS_FEES_NOTE/);
      assert.match(source, /relio-absorbs-fees/);
    });

    it(`${label} : n'expose aucun montant de frais SasPay`, () => {
      const source = readSource(path);
      // Pas de brut envoyé, pas de taux de 3,5 % côté technicien.
      assert.equal(/0\.035|3,5\s*%/.test(source), false);
      assert.equal(/brutEnvoye|chargedAmount|fraisSaspay/i.test(source), false);
    });
  }

  it('le formulaire de devis (aperçu avant envoi) affiche la mention', () => {
    const source = readSource('src/app/technicien/demandes/[id]/page.tsx');
    assert.match(source, /apercu-devis/);
  });
});

describe('panneau de retrait : seul le NET est présenté au technicien', () => {
  it('le net demandé part bien au backend comme `amount`', () => {
    const source = readSource('src/components/finance/withdrawal-panel.tsx');
    assert.match(source, /createWithdrawalRequest/);
  });

  it('le récap de confirmation annonce « Vous recevrez », pas « Montant »', () => {
    const source = readSource('src/components/finance/withdrawal-panel.tsx');
    assert.match(source, /Vous recevrez/);
  });

  it('aucun montant de frais, de brut ni de mode de facturation n’est rendu', () => {
    const source = readSource('src/components/finance/withdrawal-panel.tsx');
    // `WithdrawalFeeBreakdown` ne doit plus afficher ces champs : sous l’Option
    // A, le brut majoré n’a plus de rapport avec le débit (qui reste le net),
    // donc l’afficher serait à la fois interdit et faux.
    assert.equal(/Frais SasPay/.test(source), false);
    assert.equal(/Débité de votre solde/.test(source), false);
    assert.equal(/Reçu bénéficiaire/.test(source), false);
    assert.equal(/feeChargeModeNote\(/.test(source), false);
    assert.equal(/chargedAmount=\{/.test(source), false);
  });

  it('aucune mention de plafond appliqué au brut', () => {
    const source = readSource('src/components/finance/withdrawal-panel.tsx');
    assert.equal(/plafond/i.test(source), false);
  });
});

/* ── GARDES STRUCTURELLES ──────────────────────────────────────────────── */

describe('garde-fous du chantier', () => {
  it('le module de frais client n’expose que la recharge (pas de payout)', () => {
    const source = readFileSync(join(SRC, 'saspay-fees.ts'), 'utf8');
    // Aucune fonction de payout côté client : la transparence client ne porte
    // que sur l'encaissement.
    assert.equal(/Payout|payout/.test(source), false);
    assert.equal(/0\.035/.test(source), false);
  });

  it('aucune dépendance ajoutée : ces modules sont purs', () => {
    for (const file of ['saspay-fees.ts', 'saspay-relio-absorbs-fees.ts']) {
      const source = readFileSync(join(SRC, file), 'utf8');
      assert.equal(/^import /m.test(source), false, `${file} ne doit rien importer`);
    }
  });

  it('le backend expose les mêmes constantes (garde de symétrie)', () => {
    // Le backend est la source de vérité : ce chemin doit exister et porter
    // les mêmes taux. Un test backend (`saspay-fees.spec.ts`) verrouille
    // ses propres valeurs ; celui-ci rappelle que le doublon est assumé.
    const backendFees = join(
      APP_ROOT, '..', 'backend', 'src', 'financial', 'saspay-fees.ts',
    );
    assert.ok(existsSync(backendFees), 'backend/src/financial/saspay-fees.ts doit exister');
    const source = readFileSync(backendFees, 'utf8');
    assert.match(source, /SASPAY_COLLECT_RATE = 0\.045/);
    assert.match(source, /SASPAY_PAYOUT_RATE = 0\.035/);
  });
});