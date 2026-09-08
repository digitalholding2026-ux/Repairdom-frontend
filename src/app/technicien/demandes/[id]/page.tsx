'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { getTechnicianDemande, acceptDemande, type TechnicianDemande } from '@/lib/api/technician-service';

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Nouvelle',
  PENDING: 'En attente',
  ACCEPTED: 'Acceptée',
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
    month: 'long',
    year: 'numeric',
  });
}

export default function TechnicianDemandeDetailPage() {
  const params = useParams<{ id: string }>();
  const [demande, setDemande] = useState<TechnicianDemande | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!params?.id) return;
      try {
        const d = await getTechnicianDemande(params.id);
        if (!cancelled) {
          setDemande(d);
          if (d.status === 'ACCEPTED') setAccepted(true);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur de chargement.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [params?.id]);

  const handleAccept = async () => {
    if (!params?.id) return;
    setAccepting(true);
    setError(null);
    try {
      await acceptDemande(params.id);
      setAccepted(true);
      setDemande((prev) => (prev ? { ...prev, status: 'ACCEPTED' } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'acceptation.');
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !demande) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
        <Link href="/technicien">
          <Button variant="secondary">Retour aux demandes</Button>
        </Link>
      </div>
    );
  }

  if (!demande) return null;

  return (
    <div className="space-y-4">
      <Link href="/technicien" className="text-sm font-medium text-primary hover:underline">
        ← Retour aux demandes
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <span className="font-mono text-lg font-semibold text-primary">{demande.reference}</span>
            <Badge variant={STATUS_VARIANTS[demande.status] ?? 'neutral'}>
              {STATUS_LABELS[demande.status] ?? demande.status}
            </Badge>
          </div>
          <CardTitle className="text-base">{demande.categoryLabel}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</h2>
            <p className="whitespace-pre-line text-sm">{demande.description}</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Localisation</h2>
            <p className="text-sm font-medium">{demande.city}</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date de la demande</h2>
            <p className="text-sm">{formatDate(demande.createdAt)}</p>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          ) : null}

          {demande.status !== 'ACCEPTED' && demande.status !== 'CANCELED' ? (
            <Button
              onClick={handleAccept}
              isLoading={accepting}
              className="w-full"
              size="lg"
            >
              Accepter la demande
            </Button>
          ) : null}

          {accepted ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/30 dark:text-emerald-300">
              Vous avez accepté cette demande. Le client a été notifié.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}