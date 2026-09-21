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
import { DemandeStatusBadge } from '@/components/ui/status-badge';
import {
  getTechnicianFinanceSummary,
  type TechnicianFinanceSummary,
  type TechnicianFinanceTransaction,
  type TechnicianMissionFinance,
} from '@/lib/api/finance-service';
import { listMyDemandes, type TechnicianDemande } from '@/lib/api/technician-service';
import {
  formatCurrency,
  formatCurrencySigned,
  formatDateTime,
  fullName,
} from '@/lib/format';
import { RevenueOverview } from '@/components/technician/revenus/revenue-overview';
import { RevenueChart } from '@/components/technician/revenus/revenue-chart';
import { TopMissions } from '@/components/technician/revenus/top-missions';
import { PendingMissionsBanner } from '@/components/technician/revenus/pending-missions-banner';
import { RevenusSkeleton } from '@/components/technician/revenus/revenus-skeleton';

const PENDING_STATUSES = ['ACCEPTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'];

const TECH_TXN_LABELS: Record<string, string> = {
  TECHNICIAN_REPAIR_REVENUE: 'Gain réparation',
  TECHNICIAN_TRAVEL_REVENUE: 'Gain déplacement',
  TECHNICIAN_FEE: 'Commission Relio (2 %)',
};

function txnLabel(type: string): string {
  return TECH_TXN_LABELS[type] ?? type.replace(/_/g, ' ').toLowerCase();
}

export default function TechnicianRevenusPage() {
  const [summary, setSummary] = useState<TechnicianFinanceSummary | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [fin, mine] = await Promise.all([
          getTechnicianFinanceSummary(),
          listMyDemandes().catch(() => [] as TechnicianDemande[]),
        ]);
        if (cancelled) return;
        setSummary(fin);
        setPendingCount(mine.filter((d) => PENDING_STATUSES.includes(d.status)).length);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur de chargement.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <RevenusSkeleton />;

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{error}</Alert>
        <Link href="/technicien">
          <span className="text-sm font-medium text-primary hover:underline">
            Retour à l&apos;espace technicien
          </span>
        </Link>
      </div>
    );
  }

  if (!summary) return null;

  const simulation = summary.mode === 'SIMULATION';

  return (
    <div className="space-y-5">
      <PageHeader title="Mes revenus" description="Vos gains sur les interventions réglées." />

      {simulation ? (
        <Alert variant="info" icon="sparkles">
          <span className="font-semibold">Mode simulation</span> — les montants affichés sont
          fictifs : aucun encaissement ou virement réel n&apos;est effectué.
        </Alert>
      ) : null}

      {/* Hero gradient */}
      <RevenueOverview summary={summary} />

      {/* Pipeline */}
      <PendingMissionsBanner count={pendingCount} href="/technicien/chronologies" />

      <Alert variant="neutral" dense icon="info">
        Une intervention n&apos;est comptabilisée qu&apos;une fois confirmée par le client. Les
        interventions en attente ou annulées ne génèrent aucun gain.
      </Alert>

      {/* Évolution mensuelle */}
      <section className="space-y-3">
        <SectionHeader title="Évolution des revenus" />
        <Card>
          <CardContent className="py-4">
            <RevenueChart
              transactions={summary.transactions}
              currency={summary.currency}
            />
          </CardContent>
        </Card>
      </section>

      {/* Top missions */}
      <section className="space-y-3">
        <SectionHeader title="Vos meilleurs gains" />
        <TopMissions missions={summary.missions} currency={summary.currency} />
      </section>

      {/* Gains par mission */}
      <section className="space-y-3">
        <SectionHeader
          title="Gains par mission"
          action={
            summary.missions.length > 0 ? (
              <Badge variant="outline">
                {summary.missions.length} mission{summary.missions.length !== 1 ? 's' : ''}
              </Badge>
            ) : undefined
          }
        />
        {summary.missions.length === 0 ? (
          <EmptyState
            title="Aucun gain enregistré"
            description="Confirmez vos interventions réglées pour voir vos gains apparaître ici."
            action={
              <Link href="/technicien/historique">
                <Button>Voir mes interventions</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {summary.missions.map((m) => (
              <MissionEarningCard key={m.demandeId} mission={m} currency={summary.currency} />
            ))}
          </div>
        )}
      </section>

      {/* Détail des écritures */}
      <section id="ecritures" className="space-y-3 scroll-mt-20">
        <SectionHeader title="Détail des écritures" />
        {summary.transactions.length === 0 ? (
          <EmptyState
            title="Aucune écriture"
            description="Vos gains et frais apparaîtront ici au fil des missions confirmées."
            action={
              <Link href="/technicien/historique">
                <Button variant="outline">Voir mes interventions</Button>
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

function MissionEarningCard({
  mission,
  currency,
}: {
  mission: TechnicianMissionFinance;
  currency: string;
}) {
  return (
    <Link href={`/technicien/demandes/${mission.demandeId}`} className="block">
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-sm font-semibold text-primary">{mission.reference}</span>
            <DemandeStatusBadge status={mission.status} context="technician" />
          </div>
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
              <span className="text-muted-foreground">Commission Relio (2 %)</span>
              <span className="font-medium text-muted-foreground">
                {formatCurrency(mission.fees, currency)}
              </span>
            </div>
            <div className="my-1 h-px bg-border" />
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold">Gain net</span>
              <span className="font-semibold text-success-ink">
                {formatCurrency(mission.net, currency)}
              </span>
            </div>
          </div>
          {mission.settledAt ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Icon name="calendar" size="3.5" />
              Réglée le {formatDateTime(mission.settledAt)}
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
  txn: TechnicianFinanceTransaction;
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
            {txn.demande?.client
              ? ` · ${fullName(txn.demande.client.firstName, txn.demande.client.lastName)}`
              : ''}
            {txn.reversalOfId ? ' · contrepassé' : ''}
          </p>
          {txn.demande?.status ? (
            <DemandeStatusBadge status={txn.demande.status} context="technician" className="mt-1" />
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