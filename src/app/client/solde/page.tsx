'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { DemandeStatusBadge } from '@/components/ui/status-badge';
import {
  getClientFinanceSummary,
  type ClientFinanceSummary,
  type ClientFinanceTransaction,
  type ClientFinanceMission,
} from '@/lib/api/finance-service';
import { formatCurrency, formatCurrencySigned, formatDateTime } from '@/lib/format';
import { SoldeOverview } from '@/components/client/solde/solde-overview';
import { UpcomingBanner } from '@/components/client/solde/upcoming-banner';
import { SpendChart } from '@/components/client/solde/spend-chart';
import { SoldeSkeleton } from '@/components/client/solde/solde-skeleton';

const CLIENT_TXN_LABELS: Record<string, string> = {
  INITIAL_TEST_CREDIT: 'Crédit initial (simulation)',
  CLIENT_TOPUP: 'Recharge SasPay',
  CLIENT_MISSION_DEBIT: 'Prélèvement intervention',
  CLIENT_FEE: 'Frais Relio (historique)',
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

  if (loading) return <SoldeSkeleton />;

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{error}</Alert>
        <Link href="/client">
          <span className="text-sm font-medium text-primary hover:underline">
            Retour à l&apos;accueil
          </span>
        </Link>
      </div>
    );
  }

  if (!summary) return null;

  const simulation = summary.mode === 'SIMULATION';
  const missionCount = summary.missions.length;
  const avgPerMission = missionCount > 0 ? summary.totals.debit / missionCount : 0;

  return (
    <div className="space-y-5">
      <PageHeader title="Mon solde" description="Suivi de votre portefeuille Relio." backHref="/client" />

      {simulation ? (
        <Alert variant="info" icon="sparkles">
          <span className="font-semibold">Mode simulation</span> — les montants affichés sont
          fictifs et n&apos;impliquent aucun débit, encaissement ou frais réel.
        </Alert>
      ) : null}

      {/* Hero gradient */}
      <SoldeOverview summary={summary} />

      {/* Bandeau recharge / retrait */}
      <UpcomingBanner />

      {/* Stats rapides */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard
          icon="briefcase"
          label="Dépense moy. / mission"
          value={missionCount > 0 ? formatCurrency(avgPerMission, summary.currency) : '—'}
          variant="revenue"
        />
        <StatCard
          icon="check-circle"
          label="Missions débitées"
          value={missionCount}
          href="/client/demandes/historique"
        />
      </div>

      {/* Évolution dépenses */}
      <section className="space-y-3">
        <SectionHeader title="Évolution des dépenses" />
        <Card>
          <CardContent className="py-4">
            <SpendChart
              transactions={summary.transactions}
              currency={summary.currency}
            />
          </CardContent>
        </Card>
      </section>

      {/* Dépenses par mission */}
      <section className="space-y-3">
        <SectionHeader
          title="Dépenses par mission"
          action={
            missionCount > 0 ? (
              <Badge variant="outline">
                {missionCount} mission{missionCount !== 1 ? 's' : ''}
              </Badge>
            ) : undefined
          }
        />
        {missionCount === 0 ? (
          <EmptyState
            title="Aucune dépense enregistrée"
            description="Vos interventions débitées de votre solde apparaîtront ici."
            action={
              <Link href="/client/demandes">
                <Button>Voir mes missions</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {summary.missions.map((m) => (
              <MissionDebitCard key={m.demandeId} mission={m} currency={summary.currency} />
            ))}
          </div>
        )}
      </section>

      {/* Détail des mouvements */}
      <section id="mouvements" className="space-y-3 scroll-mt-20">
        <SectionHeader title="Détail des mouvements" />
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
          <div className="space-y-1 rounded-lg border border-border bg-muted/20 p-3 text-sm tabular-nums">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Réparation</span>
              <span className="font-medium">{formatCurrency(mission.repair, currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Déplacement</span>
              <span className="font-medium">{formatCurrency(mission.travel, currency)}</span>
            </div>
            {mission.fee > 0 ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Frais Relio (client, historique)</span>
                <span className="font-medium text-muted-foreground">
                  {formatCurrency(mission.fee, currency)}
                </span>
              </div>
            ) : null}
            <div className="my-1 h-px bg-border" />
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold">Total débité</span>
              <span className="font-semibold text-error-ink tabular-nums">
                {formatCurrency(mission.totalDebit, currency)}
              </span>
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
          className={`shrink-0 text-sm font-semibold tabular-nums ${credit ? 'text-success-ink' : 'text-error-ink'}`}
        >
          {formatCurrencySigned(credit ? txn.amount : -txn.amount, currency)}
        </span>
      </CardContent>
    </Card>
  );
}