'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { TechnicianHistoryDemandeCard } from '@/components/technician/technician-demande-card';
import { getMe } from '@/lib/api/auth-service';
import { listMyDemandeHistory, type TechnicianDemande } from '@/lib/api/technician-service';
import { TechnicianHistorySkeleton } from '@/components/technician/historique/technician-history-skeleton';

export default function TechnicianHistoriquePage() {
  const [history, setHistory] = useState<TechnicianDemande[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const me = await getMe();
        if (cancelled) return;
        if (me.role !== 'TECHNICIAN') {
          setError('Votre compte n\'est pas un compte technicien.');
          setLoading(false);
          return;
        }
        const historyData = await listMyDemandeHistory();
        if (!cancelled) setHistory(historyData);
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

  const doneCount = history.filter((d) => d.status === 'CONFIRMED').length;
  const canceledCount = history.filter((d) => d.status === 'CANCELED').length;

  if (loading) return <TechnicianHistorySkeleton />;

  if (error) {
    return (
      <EmptyState
        title="Accès requis"
        description={error}
        action={
          <Link href="/technicien/connexion">
            <Button>Se connecter en tant que technicien</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Historique des missions"
        description="Vos interventions terminées et annulées."
        backHref="/technicien"
      />

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard icon="briefcase" label="Missions terminées" value={doneCount} />
        <StatCard icon="x" label="Missions annulées" value={canceledCount} />
      </div>

      {history.length === 0 ? (
        <EmptyState
          title="Votre historique est vide"
          description="Les interventions confirmées et annulées apparaîtront ici."
          icon={<Icon name="briefcase" size="md" />}
        />
      ) : (
        <div className="space-y-3">
          {history.map((d) => (
            <TechnicianHistoryDemandeCard
              key={d.id}
              demande={d}
              detailHref={`/technicien/demandes/${d.id}`}
            />
          ))}
        </div>
      )}

      {(doneCount > 0 || canceledCount > 0) ? (
        <Link href="/technicien" className="block">
          <Button variant="secondary" className="w-full">
            Retour aux missions
          </Button>
        </Link>
      ) : null}
    </div>
  );
}