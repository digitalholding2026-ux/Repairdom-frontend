'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Icon } from '@/components/ui/icon';
import { DemandeStatusBadge } from '@/components/ui/status-badge';
import { Timeline, type TimelineStep } from '@/components/ui/timeline';
import { trackByReference, type PublicTracking } from '@/lib/api/tracking-service';
import { formatDateTime } from '@/lib/format';

const stepsFor = (tracking: PublicTracking): TimelineStep[] => {
  const status = tracking.status;
  const assigned = tracking.technicianAssigned;

  const state = (index: number): 'done' | 'current' | 'pending' => {
    if (status === 'SUBMITTED' || status === 'PENDING') {
      if (!assigned) return index < 1 ? 'done' : index === 1 ? 'current' : 'pending';
      return index < 2 ? 'done' : index === 2 ? 'current' : 'pending';
    }
    if (status === 'ACCEPTED') return index < 3 ? 'done' : index === 3 ? 'current' : 'pending';
    if (status === 'SCHEDULED') return index < 4 ? 'done' : index === 4 ? 'current' : 'pending';
    if (status === 'IN_PROGRESS') return index < 5 ? 'done' : index === 5 ? 'current' : 'pending';
    if (status === 'COMPLETED' || status === 'CONFIRMED') return index < 6 ? 'done' : 'pending';
    return 'pending';
  };

  return [
    {
      id: 'requested',
      title: 'Demande reçue',
      icon: 'file',
      state: state(0),
      timestamp: tracking.submittedAt ? formatDateTime(tracking.submittedAt) : undefined,
    },
    {
      id: 'assigned',
      title: 'Technicien affecté',
      icon: 'users',
      state: state(1),
    },
    {
      id: 'quote',
      title: 'Tarif accepté',
      icon: 'badge-check',
      state: state(2),
    },
    {
      id: 'scheduled',
      title: 'Rendez-vous confirmé',
      icon: 'calendar',
      state: state(3),
      timestamp: tracking.scheduledAt ? formatDateTime(tracking.scheduledAt) : undefined,
    },
    {
      id: 'upcoming',
      title: 'Intervention à venir',
      icon: 'clock',
      state: state(4),
    },
    {
      id: 'inprogress',
      title: 'Intervention en cours',
      icon: 'wrench',
      state: state(5),
    },
    {
      id: 'completed',
      title: 'Intervention terminée',
      icon: 'check-circle',
      state: state(6),
    },
  ];
};

export default function SuiviPage() {
  const searchParams = useSearchParams();
  const initialRef = (searchParams.get('reference') ?? '').trim().toUpperCase();
  const [reference, setReference] = useState(initialRef);
  const [tracking, setTracking] = useState<PublicTracking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrack = async () => {
    const ref = reference.trim().toUpperCase();
    if (!ref) return;
    setLoading(true);
    setError(null);
    try {
      const result = await trackByReference(ref);
      setTracking(result);
    } catch (err) {
      setTracking(null);
      setError(err instanceof Error ? err.message : 'Erreur lors de la recherche.');
    } finally {
      setLoading(false);
    }
  };

  // Si ?reference= est présent (lien depuis la page de confirmation), on lance
  // le suivi automatiquement sans que l'utilisateur ait à appuyer sur « Suivre ».
  useEffect(() => {
    if (initialRef) {
      handleTrack();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur safe-top">
        <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between gap-3 px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Icon name="wrench" size="sm" strokeWidth={2.2} />
            </span>
            <span className="text-base font-bold tracking-tight">Suivi de mission</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">Accueil</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Suivre une intervention</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Entrez votre numéro de suivi (ex. RD-8F4K29) pour consulter l&apos;avancement de votre mission.
          </p>
        </div>

        <Card>
          <CardContent className="space-y-3">
            <Field label="Numéro de suivi" htmlFor="tracking-reference">
              <Input
                id="tracking-reference"
                value={reference}
                onChange={(e) => setReference(e.target.value.toUpperCase())}
                placeholder="RD-XXXXXX"
                className="font-mono"
              />
            </Field>
            <Button
              onClick={handleTrack}
              isLoading={loading}
              disabled={reference.trim().length === 0}
              className="w-full"
              size="lg"
            >
              Suivre
            </Button>
            {error ? <Alert variant="error">{error}</Alert> : null}
          </CardContent>
        </Card>

        {tracking ? (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="font-mono text-base font-semibold text-primary">
                  {tracking.reference}
                </CardTitle>
                <DemandeStatusBadge status={tracking.status} context="client" />
              </div>
              <p className="text-sm text-muted-foreground">{tracking.category}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {(tracking.device.domain ||
                tracking.device.brand ||
                tracking.device.model ||
                tracking.device.problem) ? (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                  <Icon name="briefcase" size="sm" className="shrink-0 text-primary" />
                  <p className="text-sm">
                    {[
                      tracking.device.domain?.name,
                      tracking.device.brand?.name,
                      tracking.device.model?.name,
                      tracking.device.problem?.name,
                    ]
                      .filter(Boolean)
                      .join(' — ')}
                  </p>
                </div>
              ) : null}
              <div>
                <p className="text-sm font-medium">Avancement</p>
                <Timeline steps={stepsFor(tracking)} className="mt-3" />
              </div>
            </CardContent>
          </Card>
        ) : null}
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground safe-bottom">
        © {new Date().getFullYear()} RepairDom. Tous droits réservés.
      </footer>
    </div>
  );
}
