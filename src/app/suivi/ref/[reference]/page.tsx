'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { PublicHeader } from '@/components/public/public-header';
import { PublicFooter } from '@/components/public/public-footer';
import { trackByReference, type PublicTracking } from '@/lib/api/tracking-service';
import { getPublicSettings, type PublicPlatformSetting } from '@/lib/api/settings-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';
import { cn } from '@/lib/cn';
import { formatFCFA } from '@/lib/format-fcfa';

function formatWhatsAppNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('237')) return digits;
  if (digits.startsWith('0')) return '237' + digits.slice(1);
  if (digits.length === 9 && digits.startsWith('6')) return '237' + digits;
  return digits;
}

function buildWhatsAppUrl(phone: string | null | undefined, message: string): string {
  const number = formatWhatsAppNumber(phone);
  if (!number) return '';
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function referenceStepState(
  status: string | null | undefined,
  step: 'received' | 'whatsapp' | 'repair' | 'completed',
): 'done' | 'current' | 'pending' {
  const order: Record<'received' | 'whatsapp' | 'repair' | 'completed', number> = {
    received: 1,
    whatsapp: 2,
    repair: 3,
    completed: 4,
  };

  const stepOrder = order[step];
  const currentStatus = status?.toUpperCase();

  if (currentStatus === 'SUBMITTED' || currentStatus === 'PENDING') {
    return stepOrder === 1 ? 'current' : 'pending';
  }
  if (currentStatus === 'ACCEPTED' || currentStatus === 'SCHEDULED' || currentStatus === 'CONFIRMED') {
    return stepOrder <= 2 ? 'done' : stepOrder === 2 ? 'current' : 'pending';
  }
  if (currentStatus === 'IN_PROGRESS') {
    return stepOrder <= 3 ? 'done' : stepOrder === 3 ? 'current' : 'pending';
  }
  if (currentStatus === 'COMPLETED') {
    return 'done';
  }
  return 'pending';
}

export default function SuiviReferencePage() {
  const { reference } = useParams<{ reference: string }>();
  const [tracking, setTracking] = useState<PublicTracking | null>(null);
  const [settings, setSettings] = useState<PublicPlatformSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) {
      setError('Référence de suivi invalide.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    void trackByReference(reference)
      .then((result) => {
        setTracking(result);
      })
      .catch((err) => {
        setTracking(null);
        setError(toUserErrorMessage(err, 'Référence introuvable.'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [reference]);

  /* Chargement des paramètres publics (nom, numéro WhatsApp de l'admin). */
  useEffect(() => {
    void getPublicSettings()
      .then((s) => setSettings(s))
      .catch(() => {
        // Échec silencieux : le bouton WhatsApp utilisera le numéro par défaut.
      });
  }, []);

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
              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <Link href="/suivi" className="flex-1 sm:flex-none">
                  <Button variant="outline">Nouvelle recherche</Button>
                </Link>
                <Link href="/" className="flex-1 sm:flex-none">
                  <Button variant="outline">Retour à l'accueil</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (!tracking) return null;

  const status = tracking.status;
  const depositAmount = tracking.price ? Math.round(tracking.price / 2) : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 overflow-x-clip px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader title="Suivi de votre demande" backHref="/" />

        {/* Bandeau de confirmation */}
        <Card className="bg-success-soft border-success/20 rounded-xl p-4">
          <CardContent className="flex items-start gap-3">
            <Icon name="check-circle" size="sm" className="text-success-ink shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-success-ink">
                Votre demande {tracking.reference} a bien été enregistrée.
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Un technicien vous contactera sur WhatsApp pour confirmer votre rendez-vous.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Suivi de l'intervention</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="relative space-y-6 pl-8">
                <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
                {[
                  {
                    id: 'received',
                    title: 'Demande reçue',
                    state: referenceStepState(status, 'received'),
                    timestamp: tracking.createdAt,
                  },
                  {
                    id: 'whatsapp',
                    title: 'Confirmation WhatsApp',
                    state: referenceStepState(status, 'whatsapp'),
                    timestamp: tracking.timeline.find((e) => e.type === 'CONFIRMED')?.date ?? null,
                  },
                  {
                    id: 'repair',
                    title: 'En cours de réparation',
                    state: referenceStepState(status, 'repair'),
                    timestamp: tracking.timeline.find((e) => e.type === 'IN_PROGRESS')?.date ?? null,
                  },
                  {
                    id: 'completed',
                    title: 'Terminée',
                    state: referenceStepState(status, 'completed'),
                    timestamp: tracking.timeline.find((e) => e.type === 'COMPLETED')?.date ?? null,
                  },
                ].map((step, index, steps) => (
                  <div key={step.id} className="flex items-start gap-3">
                    <div className="relative z-10 shrink-0">
                      <div
                        className={cn(
                          'size-6 rounded-full border-2 flex items-center justify-center',
                          step.state === 'done'
                            ? 'bg-success border-success text-success-ink'
                            : step.state === 'current'
                              ? 'bg-orange-500 border-orange-500 text-white'
                              : 'bg-slate-200 border-slate-300 text-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-500',
                        )}
                      >
                        <Icon
                          name={
                            step.state === 'done' ? 'check' : step.state === 'current' ? 'clock' : 'x'
                          }
                          size="sm"
                        />
                      </div>
                      {index < steps.length - 1 && (
                        <span className="absolute -top-6 left-2 -z-10 h-6 w-0.5 bg-slate-200 dark:bg-slate-700" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={cn(
                        'text-sm font-semibold',
                        step.state === 'done'
                          ? 'text-success-ink'
                          : step.state === 'current'
                            ? 'text-orange-700'
                            : 'text-slate-500 dark:text-slate-400',
                      )}>
                        {step.title}
                      </p>
                      {step.timestamp && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(step.timestamp).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Récapitulatif */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Récapitulatif de votre demande</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Service</p>
                  <p className="text-sm font-medium">{tracking.category}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Modèle</p>
                  <p className="text-sm font-medium">{tracking.model ?? '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Adresse</p>
                  <p className="text-sm font-medium">{tracking.address ?? '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Téléphone</p>
                  <p className="text-sm font-medium">{tracking.contactPhone ?? '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Prix</p>
                  <p className="text-sm font-medium">
                    {tracking.price != null ? formatFCFA(tracking.price) : '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Référence</p>
                  <p className="text-sm font-mono font-medium">{tracking.reference}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Paiement */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Paiement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tracking.category === 'FRP' || tracking.category === 'SYSTEME' ? (
                <div className="flex items-start gap-3">
                  <Icon name="shield-check" size="sm" className="text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Aucun paiement en ligne requis
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Vous réglerez à la fin de la réparation, directement au technicien.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Pour garantir votre réparation smartphone, un acompte de 50% est requis.
                  </p>
                  <Button
                    type="button"
                    onClick={() => {
                      // Rediriger vers le paiement SasPay (à brancher sur l'API de paiement)
                      const msg = `Bonjour, je souhaite payer l'acompte de 50% pour ma demande ${tracking.reference}.`;
                      const url = buildWhatsAppUrl(
                        settings?.adminWhatsApp,
                        msg,
                      );
                      if (url) window.open(url, '_blank');
                    }}
                    className="w-full bg-orange-500/90 py-3 text-sm font-bold text-white shadow-md shadow-orange-500/15 backdrop-blur-sm transition hover:bg-orange-500"
                  >
                    <Icon name="phone" size="sm" className="mr-2" />
                    Payer l'acompte de 50% ({depositAmount != null ? formatFCFA(depositAmount) : '—'})
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Support */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Support</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => {
                  const adminName = settings?.adminName ?? 'Relio';
                  const message = `Bonjour ${adminName}, j'ai une demande ${tracking.reference} en cours chez Relio. Pouvez-vous me contacter ?`;
                  const url = buildWhatsAppUrl(settings?.adminWhatsApp, message);
                  if (url) window.open(url, '_blank');
                }}
                className="w-full flex items-center justify-center gap-2"
              >
                <Icon name="phone" size="sm" />
                Contacter le support sur WhatsApp
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                Ouverture de WhatsApp avec le numéro configuré par l'administration.
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Link href="/" className="text-sm text-muted-foreground hover:underline">
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
