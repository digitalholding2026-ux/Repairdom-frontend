'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Modal } from '@/components/ui/modal';
import { Tabs } from '@/components/ui/tabs';
import { PageHeader } from '@/components/ui/page-header';
import { DemandeStatusBadge } from '@/components/ui/status-badge';
import {
  getClientFinanceSummary,
  type ClientFinanceSummary,
  type ClientFinanceTransaction,
} from '@/lib/api/finance-service';
import { formatCurrency, formatCurrencySigned, formatDateTime, formatRelative } from '@/lib/format';
import { SoldeOverview } from '@/components/client/solde/solde-overview';
import { WithdrawalHistory, WithdrawalPanel } from '@/components/finance/withdrawal-panel';
import { SpendChart } from '@/components/client/solde/spend-chart';
import { SoldeSkeleton } from '@/components/client/solde/solde-skeleton';

const CLIENT_TXN_LABELS: Record<string, string> = {
  INITIAL_TEST_CREDIT: 'Crédit initial',
  CLIENT_TOPUP: 'Recharge SasPay',
  CLIENT_WITHDRAWAL: 'Retrait',
  CLIENT_MISSION_DEBIT: 'Prélèvement intervention',
  CLIENT_FEE: 'Frais Relio (historique)',
  REVERSAL: 'Remboursement',
};

function txnLabel(type: string): string {
  return CLIENT_TXN_LABELS[type] ?? type.replace(/_/g, ' ').toLowerCase();
}

type MovementFilter = 'ALL' | 'TOPUP' | 'WITHDRAW' | 'HOLD';

type SoldeTab = 'MOVEMENTS' | 'WITHDRAWALS' | 'CHART';

const SOLDE_TABS = [
  { id: 'MOVEMENTS', label: 'Historique des mouvements' },
  { id: 'WITHDRAWALS', label: 'Demandes de retrait' },
  { id: 'CHART', label: 'Évolution' },
] as const;

const MOVEMENT_TABS = [
  { id: 'ALL', label: 'Tous' },
  { id: 'TOPUP', label: 'Recharges' },
  { id: 'WITHDRAW', label: 'Retraits' },
  { id: 'HOLD', label: 'Réservations' },
] as const;

/* Répartition des écritures par onglet. Les contrepassations (REVERSAL)
 * restent visibles uniquement dans « Tous ». */
function matchesMovementFilter(type: string, filter: MovementFilter): boolean {
  switch (filter) {
    case 'TOPUP':
      return type === 'CLIENT_TOPUP' || type === 'INITIAL_TEST_CREDIT';
    case 'WITHDRAW':
      return type === 'CLIENT_WITHDRAWAL';
    case 'HOLD':
      return type === 'CLIENT_MISSION_DEBIT' || type === 'CLIENT_FEE';
    default:
      return true;
  }
}

const TXN_STATUS_META: Record<string, { label: string; variant: BadgeVariant }> = {
  VALIDATED: { label: 'Validé', variant: 'success' },
  PENDING: { label: 'En attente', variant: 'info' },
  FAILED: { label: 'Échoué', variant: 'danger' },
  REVERSED: { label: 'Contrepassé', variant: 'neutral' },
};

export default function ClientSoldePage() {
  const [summary, setSummary] = useState<ClientFinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Pilotage du formulaire de retrait (modale) depuis la carte « Mon solde ».
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  // Rafraîchit l'historique des retraits après chaque demande créée.
  const [withdrawToken, setWithdrawToken] = useState(0);
  // Filtre d'onglets de la liste des mouvements.
  const [movementFilter, setMovementFilter] = useState<MovementFilter>('ALL');
  // Onglet principal du conteneur d'activité financière.
  const [mainTab, setMainTab] = useState<SoldeTab>('MOVEMENTS');

  useEffect(() => {
    void loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSummary() {
    setLoading(true);
    try {
      const data = await getClientFinanceSummary();
      setSummary(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <SoldeSkeleton />;

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{error}</Alert>
        <div className="flex gap-2">
          <Button onClick={() => void loadSummary()}>Réessayer</Button>
          <Link href="/client">
            <Button variant="outline">Retour à l&apos;accueil</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const missionCount = summary.missions.length;
  const avgPerMission = missionCount > 0 ? summary.totals.debit / missionCount : 0;
  const visibleTransactions = summary.transactions.filter((t) =>
    matchesMovementFilter(t.type, movementFilter),
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Mon solde" description="Suivi de votre portefeuille Relio." backHref="/client" />

      {/* Hero gradient */}
      <SoldeOverview summary={summary} onWithdraw={() => setWithdrawOpen(true)} />

      {/* Modale de retrait (le héros porte déjà les CTA) */}
      <Modal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        title="Retirer des fonds"
        description="Retrait réel vers votre compte Mobile Money."
      >
        <WithdrawalPanel
          bare
          available={summary.balance}
          currency={summary.currency}
          showHistory={false}
          onChanged={() => {
            void loadSummary();
            setWithdrawToken((t) => t + 1);
          }}
        />
      </Modal>

      {/* Dashboard 2 colonnes */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonne principale : activité financière unifiée */}
        <div className="rounded-2xl border border-slate-200 bg-card p-6 shadow-sm dark:border-slate-800 lg:col-span-2">
          <Tabs
            items={SOLDE_TABS}
            value={mainTab}
            onChange={(id) => setMainTab(id as SoldeTab)}
            variant="segmented"
            label="Sections du solde"
          />
          <div className="mt-4">
            {mainTab === 'MOVEMENTS' ? (
              <div className="space-y-3">
                <Tabs
                  items={MOVEMENT_TABS}
                  value={movementFilter}
                  onChange={(id) => setMovementFilter(id as MovementFilter)}
                  variant="segmented"
                  label="Filtrer les mouvements"
                />
                {summary.transactions.length === 0 ? (
                  <EmptyState
                    title="Aucun mouvement"
                    description="Vos crédits et débits apparaîtront ici au fil des interventions."
                    action={
                      <Link href="/client/demandes">
                        <Button variant="outline">Voir mes missions</Button>
                      </Link>
                    }
                  />
                ) : visibleTransactions.length === 0 ? (
                  <EmptyState
                    title="Aucun mouvement"
                    description="Aucun mouvement dans cette catégorie pour le moment."
                  />
                ) : (
                  <div className="space-y-2">
                    {visibleTransactions.map((t) => (
                      <TransactionRow key={t.id} txn={t} currency={summary.currency} />
                    ))}
                  </div>
                )}
              </div>
            ) : null}
            {mainTab === 'WITHDRAWALS' ? (
              <WithdrawalHistory
                refreshToken={withdrawToken}
                showTitle={false}
                onChanged={() => void loadSummary()}
              />
            ) : null}
            {mainTab === 'CHART' ? (
              <Card>
                <CardContent className="py-4">
                  <SpendChart
                    transactions={summary.transactions}
                    currency={summary.currency}
                  />
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>

        {/* Colonne secondaire : synthèse & sécurité */}
        <aside className="space-y-6 lg:col-span-1">
          <Card>
            <CardContent className="space-y-3 py-4">
              <p className="text-sm font-semibold">Résumé des dépenses</p>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Dépense moy. / mission</span>
                <span className="font-semibold tabular-nums">
                  {missionCount > 0 ? formatCurrency(avgPerMission, summary.currency) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Total missions débitées</span>
                <span className="font-semibold tabular-nums">{missionCount}</span>
              </div>
            </CardContent>
          </Card>
          <div className="space-y-2 rounded-xl border border-primary/10 bg-primary/5 p-4 text-xs">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Icon name="shield-check" className="h-5 w-5 text-primary" />
              Sécurité SasPay
            </p>
            <p className="leading-relaxed text-muted-foreground">
              Toutes vos transactions sont sécurisées par SasPay. Vos retraits sont crédités
              directement sur votre compte Mobile Money (MTN / Orange).
            </p>
          </div>
        </aside>
      </div>

      {/* Mention réglementaire */}
      <p className="text-center text-xs text-muted-foreground">
        Les fonds déposés sont sécurisés et ne sont crédités ou débités qu&apos;après
        confirmation officielle des opérateurs Mobile Money (MTN / Orange). Des frais
        d&apos;opérateur peuvent s&apos;appliquer lors des retraits.
      </p>
    </div>
  );
}

function TransactionRow({
  txn,
  currency,
}: {
  txn: ClientFinanceTransaction;
  currency: string;
}) {
  const credit = txn.direction === 'CREDIT';
  const statusMeta = TXN_STATUS_META[txn.status];
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
            credit ? 'bg-success-soft text-success-ink' : 'bg-error-soft text-error-ink'
          }`}
        >
          <Icon name={credit ? 'check-circle' : 'arrow-right'} size="sm" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 truncate text-sm font-medium">
            <span className="truncate">{txnLabel(txn.type)}</span>
            {statusMeta ? <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge> : null}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {formatRelative(txn.createdAt)} · {formatDateTime(txn.createdAt)}
            {txn.demande?.reference ? ` · ${txn.demande.reference}` : ''}
          </p>
          {txn.demande?.status ? (
            <DemandeStatusBadge status={txn.demande.status} context="client" className="mt-1" />
          ) : null}
        </div>
        <span
          className={`shrink-0 text-sm font-semibold tabular-nums ${credit ? 'text-success-ink' : 'text-foreground'}`}
        >
          {formatCurrencySigned(credit ? txn.amount : -txn.amount, currency)}
        </span>
      </CardContent>
    </Card>
  );
}