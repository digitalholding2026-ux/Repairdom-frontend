'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { getMe, logout, homePathForRole } from '@/lib/api/auth-service';
import { listMyDemandes, type DemandeListItem } from '@/lib/api/request-service';

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Recherche de technicien',
  PENDING: 'En attente',
  ACCEPTED: 'Technicien trouvé',
  CANCELED: 'Annulée',
};

const STATUS_VARIANTS: Record<string, 'info' | 'warning' | 'success' | 'danger' | 'neutral'> = {
  SUBMITTED: 'info',
  PENDING: 'warning',
  ACCEPTED: 'success',
  CANCELED: 'danger',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function ClientDashboard() {
  const router = useRouter();
  const [demandes, setDemandes] = useState<DemandeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const me = await getMe();
        if (cancelled) return;
        if (me.role !== 'CLIENT') {
          router.replace(homePathForRole(me.role));
          return;
        }
        const list = await listMyDemandes();
        if (!cancelled) setDemandes(list);
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
  }, [router]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/client/connexion';
  };

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
          <Link href="/client/connexion">
            <Button>Se connecter en tant que client</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Mes demandes</h1>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Déconnexion
        </Button>
      </section>

      <section>
        <Link href="/client/demande">
          <Button className="w-full">Déposer une panne</Button>
        </Link>
      </section>

      {demandes.length === 0 ? (
        <EmptyState
          title="Vous n'avez encore aucune demande"
          description="Décrivez votre panne et nous trouvons le technicien adapté près de chez vous."
          action={
            <Link href="/client/demande">
              <Button>Déposer une panne</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {demandes.map((d) => (
            <Link key={d.id} href={`/client/demandes/${d.id}`} className="block">
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-primary">{d.reference}</span>
                    <Badge variant={STATUS_VARIANTS[d.status] ?? 'neutral'}>
                      {STATUS_LABELS[d.status] ?? d.status}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{d.categoryLabel}</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{d.description}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{d.city}</span>
                    <span>·</span>
                    <span>{formatDate(d.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}