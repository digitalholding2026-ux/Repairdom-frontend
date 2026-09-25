'use client';

import { useEffect, useRef, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/page-header';
import {
  createWithdrawalRequest,
  getWithdrawalRequest,
  listWithdrawalRequests,
  verifyWithdrawalRequest,
  type CreateWithdrawalRequestResult,
  type WithdrawalNetwork,
  type WithdrawalRequest,
  type WithdrawalRequestStatus,
} from '@/lib/api/finance-service';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { toUserErrorMessage } from '@/lib/ui-error-message';

const PRESETS = [2000, 5000, 10000, 25000];

const NETWORKS: Array<{ code: WithdrawalNetwork; label: string }> = [
  { code: 'mtn_cm', label: 'MTN Mobile Money' },
  { code: 'orange_cm', label: 'Orange Money' },
];

/* UI-0 : badge centralisé sur le design system (`Badge`), libellés
 * métier conservés (statuts de retrait ≠ statuts de demande). */
function StatusBadge({ status }: { status: WithdrawalRequestStatus }) {
  const variants: Record<string, BadgeVariant> = {
    PENDING: 'neutral',
    SUCCESS: 'success',
    FAILED: 'danger',
    CANCELLED: 'danger',
  };
  const labels: Record<string, string> = {
    PENDING: 'En attente',
    SUCCESS: 'Confirmé',
    FAILED: 'Échoué',
    CANCELLED: 'Annulé',
  };
  return (
    <Badge variant={variants[status] ?? 'neutral'} className="shrink-0">
      {labels[status] ?? status}
    </Badge>
  );
}

/* Panneau de retrait partagé CLIENT / TECHNICIAN (même endpoint backend,
 * rôle porté par le JWT). Le solde affiché vient de l'API (jamais calculé
 * ici) ; les frais sont appliqués par SasPay (jamais calculés ici).
 * L'action reste visible à 0 FCFA : le formulaire explique alors le solde
 * insuffisant au lieu de disparaître.
 * Retrait réel : aucun blocage frontend sur le solde, seul le backend
 * décide (refus solde insuffisant avant création du payout SasPay).
 * Ne pas recalculer de solde ici, ne pas toucher au backend/ledger/FundsHold/SasPay. */
export function WithdrawalPanel({
  available,
  currency,
  onChanged,
  open: controlledOpen,
  onOpenChange,
  showHistory = true,
  bare = false,
}: {
  available: number;
  currency: string;
  onChanged?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showHistory?: boolean;
  /** Mode épuré (ex. dans une modale) : sans en-tête ni carte
   *  déclencheuse, le formulaire est affiché directement. */
  bare?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const effectiveOpen = bare || open;
  const setOpen = (value: boolean) => {
    setInternalOpen(value);
    onOpenChange?.(value);
  };
  const [confirming, setConfirming] = useState(false);
  const [amount, setAmount] = useState(5000);
  const [custom, setCustom] = useState('');
  const [network, setNetwork] = useState<WithdrawalNetwork>('mtn_cm');
  const [msisdn, setMsisdn] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateWithdrawalRequestResult | null>(null);
  // Jeton de rafraîchissement de l'historique : incrémenté après chaque
  // demande créée (l'historique peut vivre dans une autre section).
  const [historyToken, setHistoryToken] = useState(0);

  const effectiveAmount = custom.trim() ? Number(custom.replace(/\s/g, '')) : amount;

  // Clé d'idempotence stable par contenu : un retry rejoue la même demande.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const signature = `${effectiveAmount}|${network}|${msisdn.trim()}`;
  const lastSignature = useRef(signature);
  if (lastSignature.current !== signature) {
    lastSignature.current = signature;
    setIdempotencyKey(crypto.randomUUID());
  }

  // Retrait réel : pas de contrôle de solde côté frontend.
  // `available` reste purement informatif (affichage). Seul le backend
  // refuse éventuellement pour solde insuffisant après POST /finances/withdrawals.
  const insufficient = !Number.isInteger(effectiveAmount) || effectiveAmount <= 0;

  async function submit() {
    setError(null);
    if (!Number.isInteger(effectiveAmount) || effectiveAmount < 100) {
      setError('Montant invalide : minimum 100 FCFA.');
      return;
    }
    // Retrait réel : aucun blocage frontend sur le solde disponible ;
    // le backend applique le contrôle financier réel après POST /finances/withdrawals.
    if (!msisdn.trim()) {
      setError('Numéro Mobile Money bénéficiaire requis.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createWithdrawalRequest({
        amount: effectiveAmount,
        network,
        msisdn: msisdn.trim(),
        idempotencyKey,
      });
      setResult(created);
      setConfirming(false);
      setHistoryToken((t) => t + 1);
      onChanged?.();
    } catch (err) {
      setError(toUserErrorMessage(err, 'Retrait impossible pour le moment.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-3">
      {!bare ? <SectionHeader title="Retirer des fonds" /> : null}
      {!bare ? (
      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Solde disponible</p>
              <p className="text-xl font-bold tabular-nums">{formatCurrency(available, currency)}</p>
            </div>
            <Button variant={effectiveOpen ? 'outline' : undefined} onClick={() => { setOpen(!effectiveOpen); setConfirming(false); setResult(null); setError(null); }}>
              {effectiveOpen ? 'Fermer' : 'Retirer des fonds'}
            </Button>
          </div>
        </CardContent>
      </Card>
      ) : null}

      {effectiveOpen ? (
        <div className="space-y-3">
              {error ? <Alert variant="error">{error}</Alert> : null}

              {!confirming && !result ? (
                <>
                  <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-4">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        aria-pressed={!custom && amount === preset}
                        onClick={() => { setAmount(preset); setCustom(''); }}
                        className={`min-w-0 rounded-xl border px-2 py-2 text-xs font-semibold tabular-nums transition-colors sm:text-sm ${
                          !custom && amount === preset
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-card text-foreground'
                        }`}
                      >
                        {formatCurrency(preset, currency)}
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
                  <div className="grid grid-cols-2 gap-2">
                    {NETWORKS.map((net) => (
                      <button
                        key={net.code}
                        type="button"
                        aria-pressed={network === net.code}
                        onClick={() => setNetwork(net.code)}
                        className={`rounded-xl border p-3 text-left text-sm font-semibold transition-colors ${
                          network === net.code ? 'border-primary bg-primary/10' : 'border-border bg-card'
                        }`}
                      >
                        {net.label}
                      </button>
                    ))}
                  </div>
                  <Input
                    inputMode="tel"
                    placeholder="Numéro bénéficiaire (ex. +237690000000)"
                    value={msisdn}
                    onChange={(e) => setMsisdn(e.target.value.slice(0, 20))}
                  />
                  <Button onClick={() => setConfirming(true)} disabled={submitting} className="w-full">
                    Continuer
                  </Button>
                </>
              ) : null}

              {confirming && !result ? (
                <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Montant</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(effectiveAmount, currency)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Réseau</span>
                    <span className="font-semibold">{network === 'mtn_cm' ? 'MTN Mobile Money' : 'Orange Money'}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Bénéficiaire</span>
                    <span className="font-semibold">{msisdn.trim()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Des frais d&apos;opérateur peuvent s&apos;appliquer (montant exact confirmé par SasPay, aucun calcul local).
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setConfirming(false)} className="flex-1">
                      Retour
                    </Button>
                    <Button onClick={submit} disabled={submitting || insufficient} className="flex-1">
                      {submitting ? 'Envoi…' : 'Confirmer le retrait'}
                    </Button>
                  </div>
                </div>
              ) : null}

              {result ? (
                <div className="space-y-3">
                  {result.paymentError ? (
                    <Alert variant="error">{result.paymentError.message}</Alert>
                  ) : (
                    <Alert variant="info">
                      Retrait {result.request.reference} en attente de confirmation
                      ({formatCurrency(result.request.amount, result.request.currency)}).
                      Le débit n&apos;intervient qu&apos;après confirmation SasPay.
                    </Alert>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Référence {result.request.reference} — suivez son statut{' '}
                    {showHistory ? 'ci-dessous.' : 'dans le détail des mouvements.'}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

      {showHistory ? (
        <WithdrawalHistory refreshToken={historyToken} onChanged={onChanged} />
      ) : null}
    </section>
  );
}

/* Historique des demandes de retrait (Actualiser / Vérifier).
 * Composant autonome : peut vivre sous le formulaire ou dans une autre
 * section (ex. « Détail des mouvements » côté client). `refreshToken`
 * force un rechargement (ex. après création d'une demande ailleurs). */
export function WithdrawalHistory({
  refreshToken,
  onChanged,
  showTitle = true,
}: {
  refreshToken?: number;
  onChanged?: () => void;
  showTitle?: boolean;
}) {
  const [history, setHistory] = useState<WithdrawalRequest[]>([]);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshHistory = async () => {
    try {
      const { items } = await listWithdrawalRequests();
      setHistory(items);
    } catch {
      /* Historique optionnel : un échec ne bloque pas le parcours. */
    }
  };

  useEffect(() => {
    void refreshHistory();
  }, [refreshToken]);

  async function refreshOne(reference: string) {
    try {
      const { request } = await getWithdrawalRequest(reference);
      setHistory((prev) => prev.map((item) => (item.reference === reference ? request : item)));
      onChanged?.();
    } catch (err) {
      setError(toUserErrorMessage(err, 'Statut indisponible.'));
    }
  }

  async function verifyOne(reference: string) {
    if (verifying) return;
    setVerifying(reference);
    try {
      const { request, verificationError } = await verifyWithdrawalRequest(reference);
      if (request) {
        setHistory((prev) => prev.map((item) => (item.reference === reference ? request : item)));
      }
      if (verificationError) setError(verificationError.message);
      onChanged?.();
    } catch (err) {
      setError(toUserErrorMessage(err, 'Vérification impossible.'));
    } finally {
      setVerifying(null);
    }
  }

  if (history.length === 0) return null;

  return (
    <div className="space-y-2">
      {showTitle ? (
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Demandes de retrait
        </p>
      ) : null}
      {error ? <Alert variant="error">{error}</Alert> : null}
      {history.map((item) => (
            <Card key={item.id}>
              <CardContent className="space-y-2 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold">{item.reference}</span>
                  <StatusBadge status={item.status} />
                </div>
                <div className="flex items-center justify-between gap-2 text-sm tabular-nums">
                  <span className="text-muted-foreground">Demandé</span>
                  <span className="font-semibold">{formatCurrency(item.amount, item.currency)}</span>
                </div>
                {item.fee != null || item.chargedAmount != null || item.netAmount != null ? (
                  <div className="space-y-1 rounded-lg border border-border bg-muted/20 p-2.5 text-xs tabular-nums">
                    {item.fee != null ? (
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Frais SasPay</span>
                        <span>{formatCurrency(item.fee, item.currency)}</span>
                      </div>
                    ) : null}
                    {item.chargedAmount != null ? (
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Débité</span>
                        <span className="font-medium">{formatCurrency(item.chargedAmount, item.currency)}</span>
                      </div>
                    ) : null}
                    {item.netAmount != null ? (
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Reçu bénéficiaire</span>
                        <span className="font-medium">{formatCurrency(item.netAmount, item.currency)}</span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {item.userMessage ? (
                  <p className="text-xs text-muted-foreground">{item.userMessage}</p>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(item.createdAt)}
                  </span>
                  {item.status === 'PENDING' ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => refreshOne(item.reference)}>
                        Actualiser
                      </Button>
                      <Button size="sm" variant="outline" disabled={verifying === item.reference} onClick={() => verifyOne(item.reference)}>
                        {verifying === item.reference ? 'Vérification…' : 'Vérifier'}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
    </div>
  );
}
