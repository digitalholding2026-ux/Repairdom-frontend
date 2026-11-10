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
import { Timeline } from '@/components/ui/timeline';
import { PublicHeader } from '@/components/public/public-header';
import { PublicFooter } from '@/components/public/public-footer';
import { trackByToken, type PublicTracking } from '@/lib/api/tracking-service';
import { getPublicSettings, type PublicPlatformSetting } from '@/lib/api/settings-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';

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

function statusStep(
  status: string | null | undefined,
  step: 'received' | 'in_progress' | 'completed',
): 'done' | 'current' | 'pending' {
  const v2: Record<string, 'received' | 'in_progress' | 'completed'> = {
    SUBMITTED: 'received',
    PENDING: 'received',
    ACCEPTED: 'received',
    SCHEDULED: 'received',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CONFIRMED: 'completed',
    CANCELED: 'completed',
  };
  const current = v2[status ?? ''];
  if (!current) return 'pending';
  const order: Record<'received' | 'in_progress' | 'completed', number> = {
    received: 1,
    in_progress: 2,
    completed: 3,
  };
  return order[current] > order[step] ? 'pending' : order[current] === order[step] ? 'current' : 'done';
}

export default function SuiviTokenPage() {
  const { token } = useParams<{ token: string }>();
  const [tracking, setTracking] = useState<PublicTracking | null>(null);
  const [settings, setSettings] = useState<PublicPlatformSetting | null>(null);
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
  const completed = status === 'COMPLETED' || status === 'CONFIRMED';
  const canceled = status === 'CANCELED';
  const live = !completed && !canceled;

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 overflow-x-clip px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader title="Suivi de votre demande" backHref="/" />

        {/* Bandeau de succès après soumission du wizard */}
        {tracking.timeline.length > 0 && (
          <Card className="bg-success-soft border-success/20 rounded-xl p-4">
            <CardContent className="flex items-start gap-3">
              <Icon name="check-circle" size="sm" className="text-success-ink shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-success-ink">
                  Votre demande a bien été enregistrée
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Un technicien vous contactera sur WhatsApp pour confirmer votre rendez-vous.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {/* Récapitulatif de la demande */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Votre demande</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Modèle / Service</p>
                  <p className="text-sm font-medium">
                    {tracking.device.model?.name ||
                    tracking.device.problem?.name ||
                    tracking.category}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Adresse</p>
                  <p className="text-sm font-medium">
                    {tracking.address ?? '—'}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Référence</p>
                <p className="text-sm font-mono font-medium">{tracking.reference}</p>
              </div>
              {tracking.contactPhone && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Téléphone de contact</p>
                  <p className="text-sm font-medium">{tracking.contactPhone}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline visuelle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Suivi de l'intervention</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Timeline
                steps={[
                  {
                    id: 'received',
                    title: 'Demande reçue',
                    state: statusStep(status, 'received'),
                    icon: 'check',
                    timestamp: tracking.submittedAt,
                  },
                  {
                    id: 'in_progress',
                    title: 'En cours de réparation',
                    state: statusStep(status, 'in_progress'),
                    icon: 'wrench',
                    timestamp:
                      tracking.timeline.find((e) => e.type === 'IN_PROGRESS')?.date ??
                      tracking.scheduledAt,
                  },
                  {
                    id: 'completed',
                    title: 'Terminée',
                    state: statusStep(status, 'completed'),
                    icon: 'check-circle',
                    timestamp:
                      tracking.timeline.find((e) => e.type === 'COMPLETED')?.date ??
                      null,
                  },
                ]}
              />
            </CardContent>
          </Card>

          {live && (
            <Card className="bg-warning-soft border-warning/20 rounded-xl p-4">
              <CardContent className="flex items-start gap-3">
                <Icon name="clock" size="sm" className="text-warning-ink shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-warning-ink">
                    En attente de prise en charge
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Votre demande est visible par les techniciens Relio. Un technicien vous
                    contactera prochainement sur WhatsApp.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {completed && (
            <Card className="bg-success-soft border-success/20 rounded-xl p-4">
              <CardContent className="flex items-start gap-3">
                <Icon name="check-circle" size="sm" className="text-success-ink shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-success-ink">
                    Intervention terminée
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Votre demande a été traitée. Vous pouvez télécharger votre facture ci-dessous.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {canceled && (
            <Card className="bg-error-soft border-error/20 rounded-xl p-4">
              <CardContent className="flex items-start gap-3">
                <Icon name="alert" size="sm" className="text-error-ink shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-error-ink">Demande annulée</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cette demande a été annulée. Contactez-nous pour plus d'informations.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bouton WhatsApp - contacter le technicien / Relio */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contacter Relio</CardTitle>
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
                Contacter le technicien sur WhatsApp
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                Ouverture de WhatsApp avec le numéro configuré par l'administration.
              </p>
            </CardContent>
          </Card>

          {/* Téléchargement de la facture quand terminée */}
          {completed && tracking.timeline.some((e) => e.type === 'COMPLETED') && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Votre facture</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Votre intervention est terminée. Téléchargez votre facture détaillée ci-dessous.
                </p>
                {/* Le lien de facture est généré par l'admin lors de la clôture de la mission. */}
                <p className="text-sm text-muted-foreground">
                  La facture sera disponible ici dès que l'administrateur l'aura générée.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
