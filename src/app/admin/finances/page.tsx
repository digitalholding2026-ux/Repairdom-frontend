'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Input, Select, Field } from '@/components/ui';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Spinner } from '@/components/ui/spinner';
import { DemandeStatusBadge } from '@/components/ui/status-badge';
import { FinancesSkeleton } from '@/components/admin/finances/finances-skeleton';
import { RelioFundsSection } from '@/components/admin/finances/relio-funds-section';
import {
  getAdminFinanceSummary,
  getAdminMissionFinance,
  type AdminFinanceMission,
  type AdminFinanceModeResult,
  type AdminFinanceSummary,
  type AdminMissionFinance,
  type FinancialMode,
} from '@/lib/api/finance-service';
import { formatDateTime, formatCurrency, formatCurrencySigned, fullName } from '@/lib/format';

const MODES: FinancialMode[] = ['REAL'];

const ADMIN_TXN_LABELS: Record<string, string> = {
  INITIAL_TEST_CREDIT: 'Crédit initial',
  CLIENT_MISSION_DEBIT: 'Prélèvement client',
  CLIENT_FEE: 'Frais client (historique)',
  TECHNICIAN_REPAIR_REVENUE: 'Réparation technicien',
  TECHNICIAN_TRAVEL_REVENUE: 'Déplacement technicien',
  TECHNICIAN_FEE: 'Commission Relio (2 %)',
  REVERSAL: 'Remboursement / contrepassation',
};

function txnLabel(type: string): string {
  return ADMIN_TXN_LABELS[type] ?? type.replace(/_/g, ' ').toLowerCase();
}

export default function AdminFinancesPage() {
  const [data, setData] = useState<AdminFinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'ALL' | FinancialMode>('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reference, setReference] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [detail, setDetail] = useState<Record<string, AdminMissionFinance>>({});
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({});
  const [detailError, setDetailError] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      getAdminFinanceSummary({
        mode: mode === 'ALL' ? undefined : mode,
        from: from || undefined,
        to: to || undefined,
        reference: reference || undefined,
      })
        .then((d) => {
          if (!cancelled) setData(d);
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur de chargement.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mode, from, to, reference]);

  const resetFilters = () => {
    setMode('ALL');
    setFrom('');
    setTo('');
    setReference('');
  };

  const toggleExpand = (demandeId: string) => {
    const next = { ...expanded, [demandeId]: !expanded[demandeId] };
    setExpanded(next);
    if (next[demandeId] && !detail[demandeId] && !detailLoading[demandeId]) {
      setDetailLoading((p) => ({ ...p, [demandeId]: true }));
      setDetailError((p) => ({ ...p, [demandeId]: '' }));
      getAdminMissionFinance(demandeId)
        .then((d) => setDetail((p) => ({ ...p, [demandeId]: d })))
        .catch((err) =>
          setDetailError((p) => ({
            ...p,
            [demandeId]: err instanceof Error ? err.message : 'Erreur de chargement.',
          })),
        )
        .finally(() => setDetailLoading((p) => ({ ...p, [demandeId]: false })));
    }
  };

  const modeFilterApplied = mode !== 'ALL';

  /* Phase C — synthèse agrégée (tous modes visibles) : le cockpit s'ouvre
   * sur 3 chiffres au lieu d'empiler d'emblée les deux ModeSection. */
  const visibleModes = MODES.filter((m) => !modeFilterApplied || mode === m);
  const totalRevenue = visibleModes.reduce((acc, m) => acc + (data?.results[m].totals.repairDomRevenue ?? 0), 0);
  const totalMissions = visibleModes.reduce((acc, m) => acc + (data?.results[m].totals.missionsCount ?? 0), 0);
  const totalMismatches = visibleModes.reduce(
    (acc, m) => acc + (data?.results[m].reconciliation.mismatchMissions ?? 0),
    0,
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Finances Relio"
        description="Supervision des missions, fonds Relio (commissions 2 %) et retraits."
      />

      <nav aria-label="Sections finances" className="flex flex-wrap gap-2">
        {[
          { href: '#synthese', label: 'Synthèse' },
          { href: '#missions', label: 'Missions' },
          { href: '#fonds-relio', label: 'Fonds Relio' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full bg-secondary px-3.5 py-1.5 text-sm font-medium text-secondary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <Card>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <Field htmlFor="finMode" label="Mode">
                <Select
                  id="finMode"
                  value={mode}
                  onChange={(event) =>
                    setMode(event.target.value as 'ALL' | FinancialMode)
                  }
                >
                  <option value="ALL">Tous</option>
                  <option value="REAL">Réel</option>
                </Select>
              </Field>
            </div>
            <div>
              <Field htmlFor="finFrom" label="Du">
                <Input
                  id="finFrom"
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                />
              </Field>
            </div>
            <div>
              <Field htmlFor="finTo" label="Au">
                <Input
                  id="finTo"
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                />
              </Field>
            </div>
            <div>
              <Field htmlFor="finReference" label="Référence mission">
                <Input
                  id="finReference"
                  placeholder="Ex. : RD-AB12CD"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  maxLength={12}
                />
              </Field>
            </div>
          </div>
          {from || to || reference || mode !== 'ALL' ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {reference
                  ? `Recherche par référence « ${reference.trim()} » sur le mode sélectionné.`
                  : 'Filtres appliqués côté serveur.'}
              </p>
              <Button size="sm" variant="ghost" onClick={resetFilters}>
                Réinitialiser
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {loading ? (
        <FinancesSkeleton />
      ) : data ? (
        <div className="space-y-6">
          <section id="synthese" aria-label="Synthèse" className="grid grid-cols-3 gap-2.5 scroll-mt-20">
            <StatCard
              icon="file"
              label="Revenu Relio"
              value={formatCurrency(totalRevenue, data.currency)}
              variant="revenue"
            />
            <StatCard icon="briefcase" label="Missions" value={totalMissions} />
            <StatCard
              icon="check-circle"
              label="Écarts"
              value={totalMismatches}
            />
          </section>
          <div id="missions" className="space-y-6 scroll-mt-20">
          {MODES.map((m) => {
            if (modeFilterApplied && mode !== m) return null;
            const result = data.results[m];
            return (
              <ModeSection
                key={m}
                result={result}
                currency={data.currency}
                expectedPerMission={data.expectedPerMission}
                expanded={expanded}
                detail={detail}
                detailLoading={detailLoading}
                detailError={detailError}
                onToggle={toggleExpand}
              />
            );
          })}
          </div>
        </div>
      ) : null}

      <div id="fonds-relio" className="scroll-mt-20">
        <RelioFundsSection />
      </div>
    </div>
  );
}

function ModeSection({
  result,
  currency,
  expectedPerMission,
  expanded,
  detail,
  detailLoading,
  detailError,
  onToggle,
}: {
  result: AdminFinanceModeResult;
  currency: string;
  expectedPerMission: {
    transport: number;
    commissionRateNumerator: number;
    commissionRateDenominator: number;
    clientFee: number;
    technicianFee: number;
    total: number;
  };
  expanded: Record<string, boolean>;
  detail: Record<string, AdminMissionFinance>;
  detailLoading: Record<string, boolean>;
  detailError: Record<string, string>;
  onToggle: (demandeId: string) => void;
}) {
  const reconciliation = result.reconciliation;

  return (
    <section className="space-y-3">
      <SectionHeader
        title={
          <span className="flex items-center gap-2">
            Mode
            <Badge variant="outline">RÉEL</Badge>
          </span>
        }
        action={
          <Badge variant="outline">
            {result.totals.missionsCount} mission{result.totals.missionsCount !== 1 ? 's' : ''} ·{' '}
            {result.totals.transactionsCount} écriture{result.totals.transactionsCount !== 1 ? 's' : ''}
          </Badge>
        }
      />

      <Card>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Revenu Relio" value={formatCurrency(result.totals.repairDomRevenue, currency)} />
            <Metric label="Commissions techniciens (2 %)" value={formatCurrency(result.totals.technicianFees, currency)} />
            <Metric label="Frais clients (historique)" value={formatCurrency(result.totals.clientFees, currency)} />
            <Metric label="Débité sur les clients" value={formatCurrency(result.totals.clientDebits, currency)} />
            <Metric label="Net techniciens" value={formatCurrency(result.totals.technicianNet, currency)} />
            <Metric label="Réparation + déplacement" value={formatCurrency(result.totals.repair + result.totals.travel, currency)} />
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Réconciliation sur la période</p>
              {reconciliation.ok === true ? (
                <Badge variant="success">Conforme</Badge>
              ) : reconciliation.ok === false ? (
                <Badge variant="danger">Écart détecté</Badge>
              ) : (
                <Badge variant="neutral">Aucune mission</Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {reconciliation.missionsCount === 0
                ? 'Aucune mission avec écritures financières dans cette période.'
                : `${reconciliation.reconciledMissions} mission(s) conforme(s) · ${reconciliation.mismatchMissions} écart(s).`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Règle Relio : transport standard {formatCurrency(expectedPerMission.transport, currency)} · commission
              {' '}{expectedPerMission.commissionRateNumerator} % du brut (missions antérieures : forfait{' '}
              {formatCurrency(expectedPerMission.total, currency)}).
            </p>
          </div>
        </CardContent>
      </Card>

      {result.missions.length === 0 ? (
        <EmptyState
          title="Aucune mission avec écritures"
          description="Aucun enregistrement financier ne correspond à cette période et à ces filtres."
        />
      ) : (
        <div className="space-y-2">
          {result.missions.map((mission) => (
            <MissionRow
              key={mission.demandeId}
              mission={mission}
              currency={currency}
              expanded={Boolean(expanded[mission.demandeId])}
              detail={detail[mission.demandeId]}
              detailLoading={Boolean(detailLoading[mission.demandeId])}
              detailError={detailError[mission.demandeId] ?? null}
              onToggle={() => onToggle(mission.demandeId)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function MissionRow({
  mission,
  currency,
  expanded,
  detail,
  detailLoading,
  detailError,
  onToggle,
}: {
  mission: AdminFinanceMission;
  currency: string;
  expanded: boolean;
  detail?: AdminMissionFinance;
  detailLoading: boolean;
  detailError: string | null;
  onToggle: () => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={`finance-detail-${mission.demandeId}`}
          aria-label={`${expanded ? 'Masquer' : 'Voir'} le détail de la mission ${mission.reference ?? mission.demandeId}`}
          className="flex w-full items-center justify-between gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold text-primary">
                {mission.reference ?? mission.demandeId}
              </span>
              {mission.status ? (
                <DemandeStatusBadge status={mission.status} className="shrink-0" />
              ) : null}
              {mission.reconciled ? (
                <Badge variant="success">Conforme</Badge>
              ) : (
                <Badge variant="warning">Incomplète</Badge>
              )}
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {mission.date ? formatDateTime(mission.date) : '—'}
              {mission.client ? ` · Cl. ${fullName(mission.client.firstName, mission.client.lastName)}` : ''}
              {mission.technician ? ` · Tech. ${fullName(mission.technician.firstName, mission.technician.lastName)}` : ''}
            </p>
          </div>
          <Icon
            name="chevron-down"
            size="sm"
            className={`shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>

        <div className="grid grid-cols-2 gap-3">
          <Metric label="Débité au client" value={formatCurrency(mission.clientDebit, currency)} />
          <Metric label="Net technicien" value={formatCurrency(mission.technicianNet, currency)} />
          <Metric label="Commission client (hist.)" value={formatCurrency(mission.clientFee, currency)} />
          <Metric label="Commission Relio (2 %)" value={formatCurrency(mission.technicianFee, currency)} />
          <Metric label="Relio" value={formatCurrency(mission.repairDomRevenue, currency)} />
          <Metric label="Réparation / déplacement" value={formatCurrency(mission.repair + mission.travel, currency)} />
        </div>

        {expanded ? (
          <div id={`finance-detail-${mission.demandeId}`} className="space-y-3">
            {detailLoading ? (
              <div className="flex items-center justify-center py-6">
                <Spinner />
              </div>
            ) : detailError ? (
              <Alert variant="error">{detailError}</Alert>
            ) : detail ? (
              <AdminMissionDetail detail={detail} currency={currency} />
            ) : (
              <EmptyState
                icon={<Icon name="info" size="md" />}
                title="Aucune donnée"
                description="Aucun détail financier disponible pour cette mission."
              />
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AdminMissionDetail({ detail, currency }: { detail: AdminMissionFinance; currency: string }) {
  const f = detail.financials;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
      <div className="grid grid-cols-2 gap-3">
        <Metric label="Débité au client" value={formatCurrency(f.clientMissionDebit, currency)} />
        <Metric label="Frais client (historique)" value={formatCurrency(f.clientFee, currency)} />
        <Metric label="Réparation technicien" value={formatCurrency(f.technicianRepair, currency)} />
        <Metric label="Déplacement technicien" value={formatCurrency(f.technicianTravel, currency)} />
        <Metric label="Commission Relio (2 %)" value={formatCurrency(f.technicianFee, currency)} />
        <Metric label="Net technicien" value={formatCurrency(f.netTechnician, currency)} />
        <Metric label="Relio (réel)" value={formatCurrency(f.repairDomRevenue, currency)} />
        <Metric label="Relio attendu" value={formatCurrency(f.expectedRepairDomRevenue, currency)} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {f.reconciled ? <Badge variant="success">Réconciliée</Badge> : <Badge variant="warning">Écart</Badge>}
        {f.clientRefunded ? (
          <Badge variant="info">Client remboursé — {formatCurrency(f.clientRefundAmount, currency)}</Badge>
        ) : null}
      </div>

      {detail.quote ? (
        <div className="rounded-lg border border-border bg-card p-3 text-sm tabular-nums">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tarif accepté (réparation / déplacement)
          </p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Réparation</span>
            <span className="font-medium">{formatCurrency(detail.quote.repair, currency)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Déplacement</span>
            <span className="font-medium">{formatCurrency(detail.quote.travel, currency)}</span>
          </div>
          <div className="my-1 h-px bg-border" />
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold">Brut client (réparation + déplacement)</span>
            <span className="font-semibold">{formatCurrency(detail.quote.repair + detail.quote.travel, currency)}</span>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Écritures du grand livre
        </p>
        {detail.transactions.length === 0 ? (
          <EmptyState
            icon={<Icon name="file" size="md" />}
            title="Aucune écriture"
            description="Aucune écriture enregistrée pour cette mission."
          />
        ) : (
          detail.transactions.map((t) => {
            const credit = t.direction === 'CREDIT';
            return (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{txnLabel(t.type)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.reference}
                    {t.user ? ` · ${fullName(t.user.firstName, t.user.lastName)} (${t.user.role})` : ''}
                    {t.reversalOfId ? ' · contrepassé' : ''}
                  </p>
                </div>
                <span className={`shrink-0 text-sm font-semibold tabular-nums ${credit ? 'text-success-ink' : 'text-error-ink'}`}>
                  {formatCurrencySigned(credit ? t.amount : -t.amount, currency)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}