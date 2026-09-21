'use client';

import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { formatCurrency } from '@/lib/format';
import { getAdminKycFolders } from '@/lib/api/admin-service';
import { listDomains } from '@/lib/api/admin-service';
import { listAdminCities } from '@/lib/api/admin-service';
import { getAdminFinanceSummary } from '@/lib/api/finance-service';

/* Tableau de bord admin : UNIQUEMENT des données réellement disponibles via
 * les API existantes (aucun KPI inventé).
 * - KYC en attente : GET /admin/kyc?status=PENDING (décompte réel).
 * - Missions tracées + revenu Relio : GET /admin/finances (ledger, SIMULATION
 *   + RÉEL). « Missions tracées » = missions présentes dans la synthèse
 *   financière, pas l’intégralité de la base.
 * - Catalogue / villes : décomptes des listes admin.
 * - Supervision missions : accès par référence uniquement (aucun endpoint de
 *   liste) — carte de navigation sans indicateur chiffré.
 * Statistiques non affichées faute d’API : missions en attente, techniciens
 * inscrits, missions récentes (voir note en bas de page). */

interface DashboardData {
  pendingKyc: number;
  financeMissions: number;
  repairDomRevenue: number;
  currency: string;
  domains: number;
  problems: number;
  cities: number;
  activeCities: number;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getAdminKycFolders('PENDING'),
      getAdminFinanceSummary(),
      listDomains(),
      listAdminCities(),
    ])
      .then(([kyc, finance, domains, cities]) => {
        if (cancelled) return;
        const modes = [finance.results.SIMULATION, finance.results.REAL].filter(Boolean);
        setData({
          pendingKyc: kyc.items.length,
          financeMissions: modes.reduce((sum, mode) => sum + mode.totals.missionsCount, 0),
          repairDomRevenue: modes.reduce((sum, mode) => sum + mode.totals.repairDomRevenue, 0),
          currency: finance.currency,
          domains: domains.length,
          problems: domains.reduce((sum, domain) => sum + (domain._count?.problems ?? 0), 0),
          cities: cities.length,
          activeCities: cities.filter((city) => city.isActive).length,
        });
        setError(null);
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
  }, [reloadKey]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tableau de bord"
        description="Supervision Relio : indicateurs issus des modules existants."
      />

      {error ? (
        <div className="space-y-3">
          <Alert variant="error">{error}</Alert>
          <Button variant="secondary" onClick={() => setReloadKey((k) => k + 1)}>
            Réessayer
          </Button>
        </div>
      ) : null}

      {loading || !data ? (
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3" role="status" aria-label="Chargement du tableau de bord">
          <span className="sr-only">Chargement…</span>
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
            <StatCard
              icon="badge-check"
              label="KYC en attente"
              value={data.pendingKyc}
              href="/admin/kyc"
            />
            <StatCard
              icon="briefcase"
              label="Missions tracées"
              value={data.financeMissions}
              href="/admin/finances"
            />
            <StatCard
              icon="file"
              label="Revenu Relio"
              value={formatCurrency(data.repairDomRevenue, data.currency)}
              variant="revenue"
              href="/admin/finances"
            />
            <StatCard
              icon="wrench"
              label={`Domaines · ${data.problems} problèmes`}
              value={data.domains}
              href="/admin/catalog"
            />
            <StatCard
              icon="pin"
              label="Villes de service"
              value={`${data.activeCities}/${data.cities} actives`}
              href="/admin/catalog/villes"
            />
            <StatCard
              icon="search"
              label="Supervision missions"
              value="Par référence"
              href="/admin/missions"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            « Missions tracées » et « Revenu Relio » proviennent de la synthèse financière
            (simulation + réel). Les missions en attente, les techniciens inscrits et les
            missions récentes ne sont pas affichés : aucun endpoint dédié ne les expose.
          </p>
        </>
      )}
    </div>
  );
}
