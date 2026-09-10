'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Spinner } from '@/components/ui/spinner';
import { TechnicianHistoryDemandeCard } from '@/components/technician/technician-demande-card';
import { getMe } from '@/lib/api/auth-service';
import { listMyDemandeHistory, type TechnicianDemande } from '@/lib/api/technician-service';

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

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
        actions={
          <Badge variant="neutral">
            {history.length} mission{history.length !== 1 ? 's' : ''}
          </Badge>
        }
      />

      {history.length === 0 ? (
        <EmptyState
          title="Votre historique est vide"
          description="Les interventions confirmées et annulées apparaîtront ici."
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