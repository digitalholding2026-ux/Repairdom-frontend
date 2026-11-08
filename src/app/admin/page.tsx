'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { formatFCFA } from '@/lib/format-fcfa';
import { getAdminDashboardStats, type AdminDashboardStats, type DashboardStatRequest } from '@/lib/api/admin-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAdminDashboardStats()
      .then((stats) => {
        if (cancelled) return;
        setData(stats);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(toUserErrorMessage(err, 'Erreur de chargement.'));
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
        description="Centre de commande Relio : indicateurs et demandes à traiter."
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
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Demandes en attente
                </p>
                <p className="text-2xl font-bold">{data.demandesEnAttente}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Reçues ou devis en cours
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  En cours
                </p>
                <p className="text-2xl font-bold">{data.demandesEnCours}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Planifiées ou en intervention
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Chiffre d’affaires du mois
                </p>
                <p className="text-2xl font-bold">
                  {formatFCFA(data.caMois)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">Transactions validées</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  À traiter ce mois
                </p>
                <p className="text-2xl font-bold">
                  {data.dernieresDemandes.length}
                </p>
                <p className="text-xs text-muted-foreground mt-2">Dernières demandes</p>
              </CardContent>
            </Card>
          </div>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              À traiter en priorité
            </h2>
            <div className="space-y-2">
              {data.dernieresDemandes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune demande récente.
                </p>
              ) : (
                data.dernieresDemandes.map((r: DashboardStatRequest) => (
                  <Card key={r.id}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">
                            {r.reference}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {r.client} · {r.service}
                          </p>
                        </div>
                        <span className="text-xs font-medium">
                          {r.status}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-end">
                        <Link href={`/admin/demandes/${r.id}`} passHref legacyBehavior>
                          <Button size="sm">Gérer</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
