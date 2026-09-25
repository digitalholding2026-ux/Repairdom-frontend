'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import {
  createTopupIntent,
  type CreateTopupIntentResult,
  type TopupNetwork,
} from '@/lib/api/finance-service';
import { formatCurrency } from '@/lib/format';
import { toUserErrorMessage } from '@/lib/ui-error-message';

const PRESETS = [2000, 5000, 10000, 25000];

const NETWORKS: Array<{ code: TopupNetwork; label: string; hint: string }> = [
  { code: 'mtn_cm', label: 'MTN MoMo', hint: 'Push direct sur votre téléphone' },
  { code: 'orange_cm', label: 'Orange Money', hint: 'Push ou page de paiement selon le cas' },
];

/* Espace client — Recharger mon solde (pay-in SasPay).
 * Crée un TopupIntent Relio puis, en REAL, initialise le paiement :
 * checkout_url → redirection SasPay ; sinon push USSD (PENDING).
 * Le retour navigateur ne prouve rien : le statut réel se lit sur la page
 * de résultat (source : backend Relio). */
export default function RechargerPage() {
  const [amount, setAmount] = useState<number>(5000);
  const [custom, setCustom] = useState('');
  const [network, setNetwork] = useState<TopupNetwork>('mtn_cm');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateTopupIntentResult | null>(null);

  const effectiveAmount = custom.trim() ? Number(custom.replace(/\s/g, '')) : amount;

  // Clé d'idempotence stable par contenu : un retry (timeout, 503) rejoue la
  // MÊME intention côté backend au lieu de créer un second paiement. Elle
  // est régénérée dès que le contenu change (montant, réseau, téléphone).
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const payloadSignature = `${effectiveAmount}|${network}|${phone.trim()}`;
  const lastSignature = useRef(payloadSignature);
  if (lastSignature.current !== payloadSignature) {
    lastSignature.current = payloadSignature;
    setIdempotencyKey(crypto.randomUUID());
  }

  async function submit() {
    setError(null);
    setResult(null);
    if (!Number.isInteger(effectiveAmount) || effectiveAmount < 100) {
      setError('Montant invalide : minimum 100 FCFA.');
      return;
    }
    if (!phone.trim()) {
      setError('Numéro de téléphone requis pour recevoir la demande de paiement.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createTopupIntent({
        amount: effectiveAmount,
        network,
        phone: phone.trim(),
        idempotencyKey,
      });
      if (created.paymentError) {
        // Paiement refusé à l'init (intention FAILED, aucun débit) : la
        // raison sûre vient du backend, avec la référence pour le suivi.
        setResult(created);
        return;
      }
      if (created.checkoutUrl) {
        window.location.href = created.checkoutUrl;
        return;
      }
      setResult(created);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Recharge impossible pour le moment.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Recharger mon solde"
        description="Paiement mobile money sécurisé via SasPay."
        backHref="/client/solde"
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      {result && !result.saspayEnabled ? (
        <Alert variant="info">
          Intention {result.intent.reference} enregistrée — aucun paiement réel
          n&apos;a été initié (service de paiement indisponible).
        </Alert>
      ) : null}

      {result && result.saspayEnabled && !result.paymentError ? (
        <Card>
          <CardContent className="space-y-3 py-4">
            <Alert variant="info">
              Demande envoyée sur votre téléphone ({formatCurrency(result.intent.amount, result.intent.currency)}).
              Validez le paiement sur votre mobile, puis suivez l&apos;état ci-dessous.
            </Alert>
            <Link href={`/client/solde/recharge/result?intent=${encodeURIComponent(result.intent.reference)}`}>
              <Button>Voir l&apos;état du paiement</Button>
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {result?.paymentError ? (
        <Card>
          <CardContent className="space-y-3 py-4">
            <Alert variant="error">{result.paymentError.message}</Alert>
            <p className="text-xs text-muted-foreground">
              Référence {result.intent.reference} — aucun débit, aucun crédit.
            </p>
            <Link href={`/client/solde/recharge/result?intent=${encodeURIComponent(result.intent.reference)}`}>
              <Button variant="outline">Voir le détail</Button>
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-3">
        <SectionHeader title="Montant (FCFA)" />
        <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-4">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-pressed={!custom && amount === preset}
              onClick={() => {
                setAmount(preset);
                setCustom('');
              }}
              className={`min-w-0 rounded-xl border px-2 py-2.5 text-xs font-semibold tabular-nums transition-colors sm:text-sm ${
                !custom && amount === preset
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-foreground'
              }`}
            >
              {formatCurrency(preset, 'FCFA')}
            </button>
          ))}
        </div>
        <Input
          inputMode="numeric"
          placeholder="Ou montant libre (min. 100 FCFA)"
          value={custom}
          onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
          className="tabular-nums"
        />
      </section>

      <section className="space-y-3">
        <SectionHeader title="Réseau" />
        <div className="grid grid-cols-2 gap-2">
          {NETWORKS.map((net) => (
            <button
              key={net.code}
              type="button"
              aria-pressed={network === net.code}
              onClick={() => setNetwork(net.code)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                network === net.code
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card'
              }`}
            >
              <p className="text-sm font-semibold">{net.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{net.hint}</p>
            </button>
          ))}
        </div>
        <Input
          inputMode="tel"
          placeholder="Numéro mobile money (ex. +237690000000)"
          value={phone}
          onChange={(e) => setPhone(e.target.value.slice(0, 20))}
        />
      </section>

      <Button onClick={submit} isLoading={submitting} className="w-full">
        {`Payer ${formatCurrency(Number.isInteger(effectiveAmount) ? effectiveAmount : 0, 'FCFA')}`}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Le solde n&apos;est crédité qu&apos;après confirmation du paiement par SasPay.
      </p>
    </div>
  );
}
