'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { DemandeStatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Timeline } from '@/components/ui/timeline';
import { MissionStepper } from '@/components/mission/mission-stepper';
import { TrackingHero } from '@/components/mission/tracking-hero';
import { Celebration } from '@/components/mission/celebration';
import { PublicHeader } from '@/components/public/public-header';
import { PublicFooter } from '@/components/public/public-footer';
import { trackByReference, type PublicTracking } from '@/lib/api/tracking-service';
import { STATUS_PROGRESS } from '@/lib/mission-progress';
import { demandeStatusConfig } from '@/lib/request-status';
import { formatDateTime } from '@/lib/format';

export default function SuiviPage() {
  const [reference, setReference] = useState('');
  const [tracking, setTracking] = useState<PublicTracking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrack = async (ref?: string) => {
    const value = (ref ?? reference).trim().toUpperCase();
    if (!value) return;
    setLoading(true);
    setError(null);
    try {
      const result = await trackByReference(value);
      setTracking(result);
    } catch (err) {
      setTracking(null);
      setError(err instanceof Error ? err.message : 'Erreur lors de la recherche.');
    } finally {
      setLoading(false);
    }
  };

  // Si ?reference= est présent (lien depuis la page de confirmation), on
  // préremplit le champ et on lance le suivi automatiquement. Lecture côté
  // client uniquement (window.location) pour rester compatible avec le
  // rendu statique du build Vercel.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search)
      .get('reference')
      ?.trim()
      .toUpperCase();
    if (!fromUrl) return;
    setReference(fromUrl);
    void handleTrack(fromUrl);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 overflow-x-clip px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader
          title="Suivre une intervention"
          description="Entrez votre numéro de suivi (ex. RD-8F4K29) pour consulter l'avancement de votre mission."
          backHref="/"
        />

        <Card className="mx-auto max-w-2xl">
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
              onClick={() => void handleTrack()}
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

        {loading ? (
          <div className="space-y-4" role="status">
            <span className="sr-only">Recherche de la demande…</span>
            {/* UI-0 : shimmer unifié du design system (`Skeleton`, 1.6 s). */}
            <Skeleton className="h-44 rounded-3xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        ) : null}

        {!loading && !tracking && !error ? (
          <EmptyState
            icon={<Icon name="search" size="lg" />}
            title="Suivez votre intervention"
            description="Saisissez ci-dessus le numéro reçu lors de votre demande pour voir son avancement en temps réel."
          />
        ) : null}

        {!loading && tracking ? (
          <div className="space-y-4">
            {(() => {
              const status = tracking.status;
              const config = demandeStatusConfig(status, 'client');
              const success = status === 'COMPLETED' || status === 'CONFIRMED';
              const canceled = status === 'CANCELED';
              const live = !success && !canceled;
              const lastEntry = tracking.timeline[tracking.timeline.length - 1] ?? null;

              return (
                <>
                  <TrackingHero
                    badge={<DemandeStatusBadge status={status} context="client" />}
                    reference={tracking.reference}
                    title={tracking.category}
                    subtitle={
                      [
                        tracking.device.domain?.name,
                        tracking.device.brand?.name,
                        tracking.device.model?.name,
                        tracking.device.problem?.name,
                      ]
                        .filter(Boolean)
                        .join(' — ') || undefined
                    }
                    progress={STATUS_PROGRESS[status] ?? 0}
                    live={live}
                    canceled={canceled}
                    statusLabel={lastEntry?.label ?? config.label}
                    technician={
                      tracking.technicianAssigned
                        ? { label: 'Technicien', verified: tracking.technicianVerified }
                        : null
                    }
                  />

                  <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Icon name="clock" size="sm" className="text-muted-foreground" />
                        Étapes de la mission
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <MissionStepper
                        status={status}
                        currentHint={lastEntry?.label}
                      />
                    </CardContent>
                  </Card>

                  {tracking.timeline && tracking.timeline.length > 0 ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Icon name="file" size="sm" className="text-muted-foreground" />
                          Journal des événements
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Timeline
                          steps={tracking.timeline.map((entry, index) => ({
                            id: `${entry.type}-${index}`,
                            title: entry.label,
                            state: 'done',
                            icon: 'check',
                            timestamp: entry.date ? formatDateTime(entry.date) : undefined,
                          }))}
                          className="mt-3"
                        />
                      </CardContent>
                    </Card>
                  ) : null}

                  </div>

                  {success ? (
                    <Celebration
                      title={status === 'CONFIRMED' ? 'Mission confirmée' : 'Intervention terminée'}
                      subtitle="Merci pour votre confiance !"
                    />
                  ) : null}
                </>
              );
            })()}
          </div>
        ) : null}
      </main>

      <PublicFooter />
    </div>
  );
}
