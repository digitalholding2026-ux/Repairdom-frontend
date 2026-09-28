'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { SectionHeader } from '@/components/ui/page-header';
import {
  createTopupIntent,
  type CreateTopupIntentResult,
  type TopupNetwork,
} from '@/lib/api/finance-service';
import { formatCurrency } from '@/lib/format';
import { validateFinanceAmount } from '@/lib/finance-limits';
import { triggerHaptic } from '@/lib/haptics';
import { normalizeCmPhone } from '@/lib/phone';
import { useStableIdempotencyKey } from '@/lib/use-stable-idempotency-key';
import { toUserErrorMessage } from '@/lib/ui-error-message';
import { OPERATOR_NETWORKS, type OperatorCode } from '@/components/finance/operator-network-card';
import { OperatorNetworkCard } from '@/components/finance/operator-network-card';

const PRESETS = [2000, 5000, 10000, 25000];

/* Correspondance carte opérateur ↔ code réseau SasPay. */
const NETWORK_BY_OPERATOR: Record<OperatorCode, TopupNetwork> = {
  mtn: 'mtn_cm',
  orange: 'orange_cm',
};

function operatorOf(network: TopupNetwork): OperatorCode {
  return network === 'orange_cm' ? 'orange' : 'mtn';
}

const STEPS = [
  { icon: 'wallet', iconClass: 'text-primary', title: '1. Choisir le montant' },
  { icon: 'phone', iconClass: 'text-amber-500', title: '2. Validation USSD sur mobile' },
  { icon: 'check-circle', iconClass: 'text-emerald-500', title: '3. Crédit instantané' },
] as const;

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

  // Pré-validation UX (100 ≤ montant ≤ 10 000 000, backend = source de vérité).
  const amountError = validateFinanceAmount(effectiveAmount, 'recharge');

  // Clé d'idempotence stable par contenu : un retry (timeout, 503) rejoue la
  // MÊME intention côté backend au lieu de créer un second paiement. Elle
  // est régénérée dès que le contenu change (montant, réseau, téléphone),
  // jamais pendant le render (hook + useEffect), avec repli si
  // `crypto.randomUUID()` est indisponible.
  const { key: idempotencyKey, renew: renewIdempotencyKey } = useStableIdempotencyKey(
    `${effectiveAmount}|${network}|${phone.trim()}`,
  );

  async function submit() {
    setError(null);
    setResult(null);
    if (amountError) {
      setError(amountError);
      return;
    }
    const normalizedPhone = normalizeCmPhone(phone);
    if (!normalizedPhone) {
      setError('Numéro Mobile Money invalide. Vérifiez-le (ex. 690000000).');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createTopupIntent({
        amount: effectiveAmount,
        network,
        phone: normalizedPhone,
        idempotencyKey,
      });
      // Nouvelle tentative explicite avec contenu identique = NOUVELLE clé
      // (le backend rejoue l'existant pour une clé déjà consommée).
      renewIdempotencyKey();
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
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <div>
        <Link
          href="/client/solde"
          className="mb-3 inline-flex items-center text-xs font-medium text-slate-500 hover:text-primary"
        >
          <Icon name="arrow-left" className="mr-1 h-3.5 w-3.5" />
          Retour au solde
        </Link>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Recharger mon solde Relio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paiement ultra-sécurisé par Mobile Money (MTN / Orange via SasPay).
        </p>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-relio-card lg:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-gradient-to-br from-emerald-500/10 via-relio-orange/10 to-transparent blur-3xl"
        />
        <div className="relative space-y-5">
          {/* Comment ça se passe ? */}
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200/60 bg-slate-50 p-3 text-center text-xs dark:border-slate-800 dark:bg-slate-900/60">
            {STEPS.map((step) => (
              <div key={step.title} className="min-w-0">
                <Icon name={step.icon} size="md" className={`mx-auto mb-1 ${step.iconClass}`} />
                <p className="font-medium leading-tight">{step.title}</p>
              </div>
            ))}
          </div>

          {error ? <Alert variant="error">{error}</Alert> : null}

          {result && !result.saspayEnabled ? (
            <Alert variant="info">
              Intention {result.intent.reference} enregistrée — aucun paiement
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

          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <section className="space-y-3">
              <SectionHeader title="Montant (FCFA)" />
              <div className="grid grid-cols-2 gap-2.5">
                {PRESETS.map((preset) => {
                  const selected = !custom && amount === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        triggerHaptic();
                        setAmount(preset);
                        setCustom('');
                      }}
                      className={
                        selected
                          ? 'min-w-0 rounded-xl border-2 border-primary bg-primary/10 px-2 py-2.5 text-xs font-bold tabular-nums text-primary shadow-xs transition-all scale-[1.02] sm:text-sm'
                          : 'min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2.5 text-xs font-semibold tabular-nums text-slate-700 transition-all hover:border-primary/50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 sm:text-sm'
                      }
                    >
                      {formatCurrency(preset, 'FCFA')}
                    </button>
                  );
                })}
              </div>
              <div className="relative">
                <Input
                  inputMode="numeric"
                  placeholder="Ou montant libre (100 – 10 000 000 FCFA)"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                  className="pr-16 tabular-nums"
                  aria-label="Montant libre en FCFA"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-muted-foreground">
                  FCFA
                </span>
              </div>
              {amountError ? (
                <p className="text-xs font-medium text-error-ink" role="alert">
                  {amountError}
                </p>
              ) : null}
            </section>

            <section className="space-y-3">
              <SectionHeader title="Réseau" />
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {OPERATOR_NETWORKS.map((operator) => (
                  <OperatorNetworkCard
                    key={operator.code}
                    network={operator}
                    selected={operatorOf(network) === operator.code}
                    onSelect={() => {
                      triggerHaptic();
                      setNetwork(NETWORK_BY_OPERATOR[operator.code]);
                    }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <span
                  aria-hidden
                  className="inline-flex h-11 shrink-0 items-center rounded-lg border border-border bg-muted px-3 text-sm text-muted-foreground"
                >
                  +237
                </span>
                <Input
                  inputMode="tel"
                  placeholder="Numéro Mobile Money (ex. 690000000)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9+ ]/g, '').slice(0, 20))}
                  aria-label="Numéro Mobile Money"
                />
              </div>
            </section>

            <div className="space-y-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full text-base font-bold shadow-lg shadow-primary/25 transition-all duration-200 hover:shadow-primary/40"
                isLoading={submitting}
              >
                <Icon name="zap" size="md" className="mr-2 h-5 w-5" />
                Payer{' '}
                <span className="figure tabular-nums">
                  {formatCurrency(Number.isInteger(effectiveAmount) ? effectiveAmount : 0, 'FCFA')}
                </span>
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Le solde disponible est immédiatement mis à jour dès confirmation du paiement
                par l&apos;opérateur SasPay.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
