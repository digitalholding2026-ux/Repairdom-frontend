'use client';

import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field, Input } from '@/components/ui';
import { PageHeader } from '@/components/ui/page-header';
import { Spinner } from '@/components/ui/spinner';
import { Icon } from '@/components/ui/icon';
import {
  getRelioFundsSummary,
  listRelioWithdrawals,
  withdrawRelioFunds,
  type RelioFundsSummary,
  type RelioWithdrawal,
} from '@/lib/api/finance-service';
import { formatCurrency, formatDateTime, fullName } from '@/lib/format';
import { toUserErrorMessage } from '@/lib/ui-error-message';

/* Portefeuille Relio (Sprint ADMIN SUPER POWERS) : commissions acquises
 * (2 % du brut au CONFIRMED + historique), retraits traçables et solde
 * disponible. Le backend est la seule autorité des montants ; le frontend
 * affiche et déclenche, jamais ne calcule. */
export function RelioFundsSection() {
  const [funds, setFunds] = useState<RelioFundsSummary | null>(null);
  const [withdrawals, setWithdrawals] = useState<RelioWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const load = async () => {
    setError(null);
    try {
      const [summary, history] = await Promise.all([
        getRelioFundsSummary(),
        listRelioWithdrawals(),
      ]);
      setFunds(summary);
      setWithdrawals(history.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement des fonds Relio.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const parsedAmount = Number.parseInt(amount.replace(/\s/g, ''), 10);

  const handleWithdraw = async () => {
    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) return;
    setWithdrawing(true);
    setError(null);
    setNotice(null);
    try {
      const result = await withdrawRelioFunds(parsedAmount, note.trim() || undefined);
      setNotice(
        `Retrait ${result.reference} effectué : ${formatCurrency(result.amount, funds?.currency ?? 'FCFA')}. Disponible restant : ${formatCurrency(result.availableAfter, funds?.currency ?? 'FCFA')}.`,
      );
      setConfirmOpen(false);
      setAmount('');
      setNote('');
      await load();
    } catch (err) {
      setError(toUserErrorMessage(err, 'Erreur lors du retrait.'));
      setConfirmOpen(false);
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <section className="space-y-3">
      <PageHeader
        title="Fonds Relio"
        description="Commissions acquises (2 % du brut validé), retraits et solde disponible."
      />

      {error ? <Alert variant="error">{error}</Alert> : null}
      {notice ? <Alert variant="success">{notice}</Alert> : null}

      {loading || !funds ? (
        <div className="flex items-center justify-center py-6">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <FundMetric
              label="Disponible"
              value={formatCurrency(funds.available, funds.currency)}
              highlight
            />
            <FundMetric label="Commissions générées" value={formatCurrency(funds.acquired, funds.currency)} />
            <FundMetric label="Déjà retiré" value={formatCurrency(funds.withdrawn, funds.currency)} />
            <FundMetric
              label="Retraits"
              value={`${funds.withdrawalsCount} opération${funds.withdrawalsCount !== 1 ? 's' : ''}`}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Mode {funds.mode} — seules les commissions des missions validées (CONFIRMED) sont
            comptées comme acquises.
          </p>

          <Card>
            <CardContent className="space-y-3 pt-4">
              <p className="text-sm font-semibold">Retirer des fonds</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Montant (FCFA)" htmlFor="relioAmount" required>
                  <Input
                    id="relioAmount"
                    type="number"
                    step="1"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`Max : ${funds.available}`}
                  />
                </Field>
                <Field label="Note (optionnel)" htmlFor="relioNote" hint="500 caractères max">
                  <Input
                    id="relioNote"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ex. : Virement mensuel"
                    maxLength={500}
                  />
                </Field>
              </div>
              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={!Number.isInteger(parsedAmount) || parsedAmount <= 0}
              >
                <Icon name="send" size="3.5" />
                Retirer
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 pt-4">
              <p className="text-sm font-semibold">Historique des retraits</p>
              {withdrawals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun retrait effectué.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="py-1.5 pr-3 font-medium">Date</th>
                        <th className="py-1.5 pr-3 font-medium">Montant</th>
                        <th className="py-1.5 pr-3 font-medium">Admin</th>
                        <th className="py-1.5 pr-3 font-medium">Référence</th>
                        <th className="py-1.5 font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.map((w) => (
                        <tr key={w.id} className="border-t border-border">
                          <td className="py-2 pr-3 text-xs text-muted-foreground">
                            {formatDateTime(w.createdAt)}
                          </td>
                          <td className="py-2 pr-3 font-medium tabular-nums">
                            {formatCurrency(w.amount, funds.currency)}
                          </td>
                          <td className="py-2 pr-3">
                            {fullName(w.requestedBy.firstName, w.requestedBy.lastName)}
                          </td>
                          <td className="py-2 pr-3 font-mono text-xs">{w.reference}</td>
                          <td className="py-2">
                            <Badge variant={w.status === 'VALIDATED' ? 'success' : 'neutral'}>
                              {w.status === 'VALIDATED' ? 'VALIDÉ' : w.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void handleWithdraw()}
        loading={withdrawing}
        tone="danger"
        title="Confirmer le retrait ?"
        description={
          funds && Number.isInteger(parsedAmount) && parsedAmount > 0
            ? `Retirer ${formatCurrency(parsedAmount, funds.currency)} des fonds Relio ? Cette opération traçable ne peut pas être annulée.`
            : 'Montant invalide.'
        }
        confirmLabel="Retirer"
      />
    </section>
  );
}

function FundMetric({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'border-primary/40' : undefined}>
      <CardContent className="pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="figure mt-1 text-lg font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
