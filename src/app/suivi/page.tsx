'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PublicHeader } from '@/components/public/public-header';
import { PublicFooter } from '@/components/public/public-footer';
import {
  trackByPhone,
  type TrackSearchResult,
} from '@/lib/api/tracking-service';
import { trackByReference } from '@/lib/api/tracking-service';
import { formatDate } from '@/lib/format';
import { toUserErrorMessage } from '@/lib/ui-error-message';

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    SUBMITTED: 'Reçue',
    PENDING: 'En attente',
    ACCEPTED: 'Acceptée',
    SCHEDULED: 'Planifiée',
    IN_PROGRESS: 'En cours',
    COMPLETED: 'Terminée',
    CONFIRMED: 'Confirmée',
    CANCELED: 'Annulée',
  };
  return labels[status] ?? status;
}

export default function SuiviPage() {
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [results, setResults] = useState<TrackSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Recherche par référence (RD-XXXXXX) - redirige vers la page détaillée */
  const [reference, setReference] = useState('');

  const handleSearchByPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await trackByPhone(phone.trim());
      setResults(result);
    } catch (err) {
      setResults([]);
      setError(toUserErrorMessage(err, 'Erreur lors de la recherche.'));
    } finally {
      setLoading(false);
    }
  };

  const handleTrackByReference = async (ref: string) => {
    try {
      await trackByReference(ref);
      router.push(`/suivi/ref/${ref}`);
    } catch (err) {
      setResults([]);
      setError(toUserErrorMessage(err, 'Demande introuvable.'));
    }
  };

  const inProgress = results.filter(
    (r) => r.status === 'RECEIVED' || r.status === 'IN_PROGRESS',
  );
  const history = results.filter(
    (r) => r.status === 'COMPLETED' || r.status === 'CONFIRMED' || r.status === 'CANCELED',
  );

  if (loading && results.length === 0) {
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

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 overflow-x-clip px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader title="Suivi de votre demande" backHref="/" />

        {/* Recherche par numéro de téléphone (client invité) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rechercher ma demande</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearchByPhone} className="space-y-3">
              <Field label="Numéro WhatsApp" htmlFor="tracking-phone">
                <Input
                  id="tracking-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  placeholder="6XX XXX XXX"
                  inputMode="tel"
                  maxLength={15}
                />
              </Field>
              <Button
                type="submit"
                isLoading={loading}
                disabled={!phone.trim()}
                className="w-full"
              >
                Rechercher
              </Button>
            </form>
          </CardContent>
        </Card>

        {error ? (
          <Alert variant="error">{error}</Alert>
        ) : null}

        {/* Résultats de recherche */}
        {results.length > 0 && (
          <div className="space-y-4">
            {inProgress.length > 0 && (
              <section>
                <Card className="border-warning/30 bg-warning/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-warning">
                      <Icon name="clock" size="sm" />
                      Demandes en cours ({inProgress.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {inProgress.map((d) => (
                      <Card
                        key={d.id}
                        className="border-warning/20 hover:border-warning/40 transition-border cursor-pointer"
                        onClick={() =>
                          d.trackingToken && router.push(`/suivi/${d.trackingToken}`)
                        }
                      >
                        <CardContent className="space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">
                                {d.service} - {d.reference}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {d.status ? statusLabel(d.status) : '—'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-mono font-medium">
                                {formatDate(d.createdAt)}
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (d.trackingToken) {
                                    router.push(`/suivi/${d.trackingToken}`);
                                  }
                                }}
                              >
                                Voir le suivi
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </CardContent>
                </Card>
              </section>
            )}

            {history.length > 0 && (
              <section>
                <Card className="border-muted/30 bg-muted/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-muted">
                      <Icon name="file" size="sm" />
                      Historique ({history.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {history.map((d) => (
                      <Card
                        key={d.id}
                        className="border-muted/20 hover:border-muted/40 transition-border cursor-pointer"
                        onClick={() =>
                          d.trackingToken && router.push(`/suivi/${d.trackingToken}`)
                        }
                      >
                        <CardContent className="space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">
                                {d.service} - {d.reference}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {d.status ? statusLabel(d.status) : '—'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-mono font-medium">
                                {formatDate(d.createdAt)}
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (d.trackingToken) {
                                    router.push(`/suivi/${d.trackingToken}`);
                                  }
                                }}
                              >
                                Voir le suivi
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </CardContent>
                </Card>
              </section>
            )}
          </div>
        )}

        {/* Référence de suivi (RD-XXXXXX) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Suivi par référence</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
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
                type="button"
                onClick={() => handleTrackByReference(reference)}
                disabled={reference.trim().length === 0}
                className="w-full"
              >
                Suivre
              </Button>
              {error ? <Alert variant="error">{error}</Alert> : null}
            </form>
          </CardContent>
        </Card>

        {!loading && results.length === 0 && !error && phone.trim() === '' && reference.trim() === '' ? (
          <EmptyState
            icon={<Icon name="search" size="lg" />}
            title="Suivez votre intervention"
            description="Saisissez votre numéro WhatsApp ou votre référence de suivi (ex. RD-8F4K29) pour consulter l'avancement de votre mission."
          />
        ) : null}
      </main>

      <PublicFooter />
    </div>
  );
}
