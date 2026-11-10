'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { DemandeStatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Timeline } from '@/components/ui/timeline';
import { TrackingHero } from '@/components/mission/tracking-hero';
import { RechercheTechnicienAnimation } from '@/components/lottie/lottie-animations';
import { Celebration } from '@/components/mission/celebration';
import { PublicHeader } from '@/components/public/public-header';
import { PublicFooter } from '@/components/public/public-footer';
import { trackByToken, type PublicTracking } from '@/lib/api/tracking-service';
import { STATUS_PROGRESS } from '@/lib/mission-progress';
import { demandeStatusConfig } from '@/lib/request-status';
import { formatDateTime } from '@/lib/format';
import { toUserErrorMessage } from '@/lib/ui-error-message';

export default function SuiviTokenPage() {
  const { token } = useParams<{ token: string }>();
  const [tracking, setTracking] = useState<PublicTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Lien de suivi invalide.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    void trackByToken(token)
      .then((result) => {
        setTracking(result);
      })
      .catch((err) => {
        setTracking(null);
        setError(toUserErrorMessage(err, 'Lien de suivi invalide ou demande introuvable.'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col">
        <PublicHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 overflow-x-clip px-4 py-6 sm:px-6 lg:px-8">
          <PageHeader title="Suivi de votre demande" backHref="/" />
          <div className="space-y-4" role="status">
            <span className="sr-only">Recherche de votre demande…</span>
            <Skeleton className="h-44 rounded-3xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (error && !tracking) {
    return (
      <div className="flex min-h-dvh flex-col">
        <PublicHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 overflow-x-clip px-4 py-6 sm:px-6 lg:px-8">
          <PageHeader title="Suivi de votre demande" backHref="/" />
          <Card>
            <CardContent>
              <Alert variant="error">{error}</Alert>
              <Link href="/">
                <Button variant="outline">Retour à l'accueil</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (!tracking) return null;

  const status = tracking.status;
  const config = demandeStatusConfig(status, 'client');
  const success = status === 'COMPLETED' || status === 'CONFIRMED';
  const canceled = status === 'CANCELED';
  const live = !success && !canceled;
  const lastEntry = tracking.timeline[tracking.timeline.length - 1] ?? null;

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 overflow-x-clip px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader title="Suivi de votre demande" backHref="/" />

        <div className="space-y-4">
          {(() => {
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

                {live && !tracking.technicianAssigned ? (
                  <Card>
                    <CardContent className="flex items-center gap-4 py-4">
                      <RechercheTechnicienAnimation className="h-20 w-20 sm:h-24 sm:w-24" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          Recherche d'un technicien disponible…
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Votre demande est visible par les techniciens vérifiés à proximité.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Icon name="clock" size="sm" className="text-muted-foreground" />
                        Détails de la demande
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Référence : <span className="font-mono font-medium">{tracking.reference}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Statut :{' '}
                        <DemandeStatusBadge status={status} context="client" />
                      </p>
                      {tracking.scheduledAt && (
                        <p className="text-sm text-muted-foreground">
                          Rendez-vous :{' '}
                          <span className="font-medium">
                            {new Date(tracking.scheduledAt).toLocaleDateString('fr-FR', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </p>
                      )}
                      {tracking.timing.requestedAt && (
                        <p className="text-sm text-muted-foreground">
                          Mode : {tracking.timing.mode === 'SCHEDULED' ? 'Sur rendez-vous' : 'Dès que possible'}
                        </p>
                      )}
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
                    title={
                      status === 'CONFIRMED'
                        ? 'Votre rendez-vous est confirmé'
                        : 'Votre intervention est terminée'
                    }
                    subtitle="Merci pour votre confiance !"
                  />
                ) : null}
              </>
            );
          })()}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
