'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Spinner } from '@/components/ui/spinner';
import { DemandeStatusBadge } from '@/components/ui/status-badge';
import {
  getClientFinanceSummary,
  type ClientFinanceMission,
  type ClientFinanceSummary,
  type ClientFinanceTransaction,
} from '@/lib/api/finance-service';
import { formatDateTime, formatCurrency, formatCurrencySigned } from '@/lib/format';

const CLIENT_TXN_LABELS: Record<string, string> = {
  INITIAL_TEST_CREDIT: 'Crédit initial (simulation)',
  CLIENT_MISSION_DEBIT: 'Prélèvement intervention',
  CLIENT_FEE: 'Frais RepairDom',
  REVERSAL: 'Remboursement',
};

function txnLabel(type: string): string {
  return CLIENT_TXN_LABELS[type] ?? type.replace(/_/g, ' ').toLowerCase();
}

export default function ClientSoldePage() {
  const [summary, setSummary] = useState<ClientFinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getClientFinanceSummary()
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur de chargement.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{error}</Alert>
        <Link href="/client">
          <span className="text-sm font-medium text-primary hover:underline">Retour à l&apos;accueil</span>
        </Link>
      </div>
    );
  }

  if (!summary) return null;

  const simulation = summary.mode === 'SIMULATION';

  return (
    <div className="space-y-5">
      <PageHeader title="Mon solde" description="Suivi de votre porte-monnaie RepairDom." />

      {simulation ? (
        <Alert variant="info" icon="sparkles">
          <span className="font-semibold">Mode simulation</span> — les montants affichés sont
          fictifs et n&apos;impliquent aucun débit, encaissement ou frais réel.
        </Alert>
      ) : null}

      <Card>
        <CardContent className="space-y-3 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Solde disponible</p>
              <p className="mt-1 text-3xl font-bold tracking-tight">
                {formatCurrency(summary.balance, summary.currency)}
              </p>
            </div>
            {simulation ? <Badge variant="warning">SIMULATION</Badge> : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Crédits reçus</p>
              <p className="mt-0.5 font-semibold text-success">
                {formatCurrency(summary.totals.credit, summary.currency)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Débits</p>
              <p className="mt-0.5 font-semibold text-error">
                {formatCurrency(summary.totals.debit, summary.currency)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <SectionHeader
          title="Dépenses par mission"
          action={
            summary.missions.length > 0 ? (
              <Badge variant={summary.missions.length > 0 ? 'outline' : 'neutral'}>
                {summary.missions.length} mission{summary.missions.length !== 1 ? 's' : ''}
              </Badge>
            ) : undefined
          }
        />
        {summary.missions.length === 0 ? (
          <EmptyState
            title="Aucune dépense enregistrée"
            description="Vos interventions débitées de votre solde apparaîtront ici."
          />
        ) : (
          <div className="space-y-3">
            {summary.missions.map((m) => (
              <MissionDebitCard key={m.demandeId} mission={m} currency={summary.currency} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <SectionHeader title="Historique des mouvements" />
        {summary.transactions.length === 0 ? (
          <EmptyState
            title="Aucun mouvement"
            description="Vos crédits et débits apparaîtront ici au fil des interventions."
          />
        ) : (
          <div className="space-y-2">
            {summary.transactions.map((t) => (
              <TransactionRow key={t.id} txn={t} currency={summary.currency} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MissionDebitCard({
  mission,
  currency,
}: {
  mission: ClientFinanceMission;
  currency: string;
}) {
  return (
    <Link href={`/client/demandes/${mission.demandeId}`} className="block">
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-sm font-semibold text-primary">{mission.reference}</span>
            <DemandeStatusBadge status={mission.status} context="client" />
          </div>
          {mission.refunded ? (
            <Alert variant="success" dense icon="check-circle">
              Remboursé — {formatCurrency(mission.refundAmount, currency)}
            </Alert>
          ) : null}
          <div className="space-y-1 rounded-lg border border-border bg-muted/20 p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Réparation</span>
              <span className="font-medium">{formatCurrency(mission.repair, currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Déplacement</span>
              <span className="font-medium">{formatCurrency(mission.travel, currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Frais RepairDom (client)</span>
              <span className="font-medium">{formatCurrency(mission.fee, currency)}</span>
            </div>
            <div className="my-1 h-px bg-border" />
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold">Total débité</span>
              <span className="font-semibold">{formatCurrency(mission.totalDebit, currency)}</span>
            </div>
          </div>
          {mission.scheduledAt ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Icon name="calendar" size="3.5" />
              {formatDateTime(mission.scheduledAt)}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </Link>
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
          <p className="truncate text-sm font-medium">{txnLabel(txn.type)}</p>
          <p className="truncate text-xs text-muted-foreground">
            {formatDateTime(txn.createdAt)}
            {txn.demande?.reference ? ` · ${txn.demande.reference}` : ''}
            {txn.reversalOfId ? ' · contrepassé' : ''}
          </p>
          {txn.demande?.status ? (
            <DemandeStatusBadge status={txn.demande.status} context="client" className="mt-1" />
          ) : null}
        </div>
        <span
          className={`shrink-0 text-sm font-semibold ${credit ? 'text-success-ink' : 'text-error-ink'}`}
        >
          {formatCurrencySigned(credit ? txn.amount : -txn.amount, currency)}
        </span>
      </CardContent>
    </Card>
  );
}