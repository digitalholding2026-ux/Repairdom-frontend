'use client';

import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
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
import { validateFinanceAmount } from '@/lib/finance-limits';
import { normalizeCmPhone } from '@/lib/phone';
import { relioAbsorbsTransferFeesNote } from '@/lib/saspay-relio-absorbs-fees';
import { useStableIdempotencyKey } from '@/lib/use-stable-idempotency-key';
import { toUserErrorMessage } from '@/lib/ui-error-message';
import { OPERATOR_NETWORKS, type OperatorCode } from './operator-network-card';
import { OperatorNetworkCard } from './operator-network-card';

const PRESETS = [2000, 5000, 10000, 25000];

/* Correspondance carte opérateur ↔ code réseau SasPay. */
const NETWORK_BY_OPERATOR: Record<OperatorCode, WithdrawalNetwork> = {
  mtn: 'mtn_cm',
  orange: 'orange_cm',
};

function operatorOf(network: WithdrawalNetwork): OperatorCode {
  return network === 'orange_cm' ? 'orange' : 'mtn';
}

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

  // Clé d'idempotence stable par contenu (jamais de setState pendant le
  // render, repli si `crypto.randomUUID()` indisponible). Renouvelée après
  // chaque demande créée pour qu'une nouvelle tentative explicite ne rejoue
  // pas l'ancienne.
  const { key: idempotencyKey, renew: renewIdempotencyKey } =
    useStableIdempotencyKey(`${effectiveAmount}|${network}|${msisdn.trim()}`);

  // Retrait réel : pas de contrôle de solde côté frontend.
  // `available` reste purement informatif (affichage). Seul le backend
  // refuse éventuellement pour solde insuffisant après POST /finances/withdrawals.
  // Règle frontend unique et visible : retrait minimum 100 FCFA, maximum
  // 10 000 000 FCFA (le backend reste la source de vérité).
  const amountError = validateFinanceAmount(effectiveAmount, 'retrait');
  const insufficient = amountError !== null;
  // Numéro affiché normalisé (+237…) dès la confirmation, comme envoyé.
  const displayMsisdn = normalizeCmPhone(msisdn) ?? msisdn.trim();
  /* Mode modale (bottom-sheet) : champs ultra-compacts pour tenir sans
   * scroll sur petit écran (labels 11px, inputs h-9). */
  const compactInputClass = bare ? 'h-9 rounded-xl bg-slate-50 text-xs sm:text-xs' : undefined;
  const bareLabelClass = bare
    ? 'text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300'
    : 'text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200';

  async function submit() {
    setError(null);
    if (amountError) {
      setError(`${amountError} Retrait minimum : 100 FCFA.`);
      return;
    }
    // Retrait réel : aucun blocage frontend sur le solde disponible ;
    // le backend applique le contrôle financier réel après POST /finances/withdrawals.
    const normalizedMsisdn = normalizeCmPhone(msisdn);
    if (!normalizedMsisdn) {
      setError('Numéro Mobile Money bénéficiaire invalide. Vérifiez-le (ex. 690000000).');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createWithdrawalRequest({
        amount: effectiveAmount,
        network,
        msisdn: normalizedMsisdn,
        idempotencyKey,
      });
      setResult(created);
      setConfirming(false);
      renewIdempotencyKey();
      setHistoryToken((t) => t + 1);
      onChanged?.();
    } catch (err) {
      setError(toUserErrorMessage(err, 'Retrait impossible pour le moment.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={bare ? 'space-y-2.5' : 'space-y-3'}>
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
                  {bare ? (
                    <p className={bareLabelClass}>
                      Montant (FCFA)
                    </p>
                  ) : null}
                  <div className="grid grid-cols-2 gap-1.5">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        aria-pressed={!custom && amount === preset}
                        onClick={() => { setAmount(preset); setCustom(''); }}
                        className={`min-w-0 rounded-lg border px-2 py-1.5 text-xs font-bold tabular-nums transition-all ${
                          !custom && amount === preset
                            ? 'border-orange-500/50 bg-orange-500/10 text-orange-600 shadow-sm'
                            : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {formatCurrency(preset, currency)}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <Input
                      inputMode="numeric"
                      placeholder="Ou montant libre (100 – 10 000 000 FCFA)"
                      value={custom}
                      onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                      className={compactInputClass ? `${compactInputClass} pr-16 tabular-nums` : 'pr-16 tabular-nums'}
                      aria-label="Montant libre en FCFA"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted-foreground">
                      FCFA
                    </span>
                  </div>
                  {amountError ? (
                    <p className="text-xs font-medium text-error-ink" role="alert">
                      {amountError} Retrait minimum : 100 FCFA.
                    </p>
                  ) : null}
                  {bare ? (
                    <p className={bareLabelClass}>
                      Réseau de retrait
                    </p>
                  ) : null}
                  <div className={bare ? 'grid grid-cols-2 gap-1.5' : 'grid grid-cols-1 gap-2.5 sm:grid-cols-2'}>
                    {OPERATOR_NETWORKS.map((operator) => (
                      <OperatorNetworkCard
                        key={operator.code}
                        network={operator}
                        selected={operatorOf(network) === operator.code}
                        onSelect={() => setNetwork(NETWORK_BY_OPERATOR[operator.code])}
                        dense={bare}
                      />
                    ))}
                  </div>
                  {bare ? (
                    <p className={bareLabelClass}>
                      Numéro bénéficiaire
                    </p>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={bare
                        ? 'flex-shrink-0 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600'
                        : 'inline-flex h-11 shrink-0 items-center rounded-lg border border-border bg-muted px-3 text-sm text-muted-foreground'}
                    >
                      +237
                    </span>
                    <Input
                      inputMode="tel"
                      placeholder={bare ? '6 XX XX XX XX' : 'Numéro bénéficiaire (ex. 690000000)'}
                      value={msisdn}
                      onChange={(e) => setMsisdn(e.target.value.replace(/[^0-9+ ]/g, '').slice(0, 20))}
                      aria-label="Numéro Mobile Money bénéficiaire"
                      className={compactInputClass}
                    />
                  </div>
                  {!bare ? (
                    <Button
                      onClick={() => {
                        if (amountError) {
                          setError(`${amountError} Retrait minimum : 100 FCFA.`);
                          return;
                        }
                        setConfirming(true);
                      }}
                      disabled={submitting || insufficient}
                      className="w-full"
                    >
                      Continuer
                    </Button>
                  ) : null}
                </>
              ) : null}

              {confirming && !result ? (
                <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3 text-sm">
<div className="flex justify-between gap-3">
                    <span className="font-semibold">Vous recevrez</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(effectiveAmount, currency)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Réseau</span>
                    <span className="font-semibold">{network === 'mtn_cm' ? 'MTN MoMo' : 'Orange Money'}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Bénéficiaire</span>
                    <span className="font-semibold">{displayMsisdn || '—'}</span>
                  </div>
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Icon name="info" size="sm" className="mt-0.5 shrink-0" />
                    <span>
                      {relioAbsorbsTransferFeesNote('retrait')}
                    </span>
                  </p>
                  {!bare ? (
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setConfirming(false)} className="flex-1">
                        Retour
                      </Button>
                      <Button onClick={submit} disabled={submitting || insufficient} className="flex-1">
                        {submitting ? 'Envoi…' : 'Confirmer le retrait'}
                      </Button>
                    </div>
                  ) : null}
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
                  {/* Reçu : montant réel backend (jamais calculé ici).
                      OPTION A : aucun montant de frais ni de brut envoyé
                      n'est exposé — le bénéficiaire voit le NET demandé,
                      les frais de transfert sont pris en charge par Relio. */}
                  <div className="flex justify-between gap-3 text-sm tabular-nums">
                    <span className="text-muted-foreground">Montant demandé</span>
                    <span className="font-semibold">{formatCurrency(result.request.amount, result.request.currency)}</span>
                  </div>
                  <WithdrawalFeeBreakdown />
                  <p className="text-xs text-muted-foreground">
                    Référence {result.request.reference} — suivez son statut{' '}
                    {showHistory ? 'ci-dessous.' : 'dans le détail des mouvements.'}
                  </p>
                </div>
              ) : null}

              {/* Footer ancré (mode modale) : l'action reste TOUJOURS visible,
                  même si le corps défile sur petit écran. */}
              {bare && !result ? (
                <div className="sticky bottom-0 -mx-3 -mb-3 border-t border-border bg-card/95 px-3 py-2.5 backdrop-blur">
                  {!confirming ? (
                    <Button
                      onClick={() => {
                        if (amountError) {
                          setError(`${amountError} Retrait minimum : 100 FCFA.`);
                          return;
                        }
                        setConfirming(true);
                      }}
                      disabled={submitting || insufficient}
                      className="w-full py-2.5 text-xs font-bold shadow-md shadow-orange-500/20"
                    >
                      Continuer
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setConfirming(false)} className="flex-1">
                        Retour
                      </Button>
                      <Button
                        onClick={submit}
                        disabled={submitting || insufficient}
                        className="flex-1 py-2.5 text-xs font-bold shadow-md shadow-orange-500/20"
                      >
                        {submitting ? 'Envoi…' : 'Confirmer le retrait'}
                      </Button>
                    </div>
                  )}
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

/** OPTION A : les frais de payout ne sont plus détaillés côté technicien.
 *
 *  Avant ce chantier, ce composant affichait le montant des frais SasPay,
 *  le brut débité du solde Relio et le net versé au bénéficiaire. C'était
 *  exact à l'époque (Relio envoyait le net, SasPay retenait ses frais sur
 *  le montant du technicien) — et ça l'est devenu faux : Relio absorbe
 *  désormais les frais, donc le brut majoré n'a plus de rapport avec le
 *  débit du solde, qui reste le net demandé.
 *
 *  Afficher ces trois lignes serait donc à la fois interdit par la règle du
 *  chantier (« aucun montant de frais SasPay exposé au technicien ») et
 *  faux vis-à-vis du débit réel. Il ne reste que la mention.
 *
 *  Le coût supporté par Relio reste tracé côté serveur
 *  (`FinancialTransaction.metadata` + `WithdrawalRequest.fee`), donc
 *  toujours disponible pour la comptabilité et la réconciliation.
 *
 *  `feeChargeModeNote` (`@/lib/withdrawal-fees`) reste en place pour l'admin :
 *  il n'a plus d'appelant UI ici, mais reste testé et documenté. */
export function WithdrawalFeeBreakdown() {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-2.5">
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Icon name="info" size="sm" className="mt-0.5 shrink-0" />
        <span>{relioAbsorbsTransferFeesNote('retrait')}</span>
      </p>
    </div>
  );
}
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
  // Distingue « aucun retrait » (état vide légitime) d'un échec de
  // chargement (état d'erreur avec réessai) : l'historique ne reste plus
  // silencieux. Le chargement initial affiche un placeholder.
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const refreshHistory = async () => {
    setLoadingHistory(true);
    try {
      const { items } = await listWithdrawalRequests();
      setHistory(items);
      setLoadFailed(false);
    } catch {
      /* Historique optionnel : un échec ne bloque pas le parcours, mais il
       * est signalé explicitement avec une action de réessai. */
      setLoadFailed(true);
    } finally {
      setLoadingHistory(false);
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

  if (history.length === 0) {
    if (loadingHistory) {
      return (
        <div className="space-y-2" role="status" aria-label="Chargement de l'historique des retraits">
          <div className="h-16 animate-pulse rounded-xl bg-muted/60" />
        </div>
      );
    }
    if (!loadFailed) return null;
    return (
      <div className="space-y-2">
        {showTitle ? (
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Demandes de retrait
          </p>
        ) : null}
        <Alert variant="error">
          Historique des retraits indisponible pour le moment.
          <span className="mt-2 block">
            <Button size="sm" variant="outline" onClick={() => void refreshHistory()}>
              Réessayer
            </Button>
          </span>
        </Alert>
      </div>
    );
  }

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
                <WithdrawalFeeBreakdown />
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
