'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { getPublicSettings } from '@/lib/api/settings-service';
import { formatFCFA } from '@/lib/format-fcfa';
import { payEscrow } from '@/lib/api/request-service';

const SERVICE_LABELS: Record<string, string> = {
  FRP: 'Déblocage',
  SYSTEME: 'Système',
  SMARTPHONE: 'Smartphone',
};

export default function SuccesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<{
    adminName: string;
    adminWhatsApp: string;
    adminAvatarUrl: string | null;
    supportEmail: string | null;
  } | null>(null);
  const [paying, setPaying] = useState(false);

  const reference = searchParams.get('reference') ?? '';
  const demandeId = searchParams.get('id') ?? '';
  const service = searchParams.get('service') ?? 'FRP';
  const address = searchParams.get('address') ?? '';
  const model = searchParams.get('model') ?? '';
  const price = Number(searchParams.get('price') ?? '0');
  const depositAmount = Number(searchParams.get('depositAmount') ?? '0');

  useEffect(() => {
    void getPublicSettings()
      .then((s) => {
        setSettings({
          adminName: s.adminName,
          adminWhatsApp: s.adminWhatsApp,
          adminAvatarUrl: s.adminAvatarUrl,
          supportEmail: s.supportEmail ?? null,
        });
      })
      .catch(() => {
        // Échec silencieux
      });
  }, []);

  const handlePayEscrow = async () => {
    setPaying(true);
    try {
      await payEscrow(demandeId);
      router.push(`/client/demandes/${demandeId}`);
    } catch {
      // Géré par l'alerte côté composant payeur
    } finally {
      setPaying(false);
    }
  };

  const buildWhatsAppUrl = (phone: string, message: string): string | null => {
    const waNumber = phone.replace(/\+/g, '');
    const text = encodeURIComponent(message);
    return `https://wa.me/${waNumber}?text=${text}`;
  };

  const handleWhatsApp = () => {
    const phone = settings?.adminWhatsApp ?? '';
    if (!phone) return;
    const message = `Bonjour, je souhaite suivre ma demande Relio (référence : ${reference}).`;
    const url = buildWhatsAppUrl(phone, message);
    if (url) window.open(url, '_blank');
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        title="Demande enregistrée avec succès !"
        description="Votre demande a bien été prise en compte."
        backHref="/"
      />

      {/* Référence bien visible */}
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">Votre référence de demande</p>
          <div className="inline-flex items-center justify-center rounded-xl border border-primary bg-primary/10 px-4 py-3 mb-4">
            <span className="font-mono text-2xl font-bold text-primary">{reference}</span>
          </div>
          <p className="text-sm">
            Conservez cette référence pour suivre l'avancement de votre demande.
          </p>
        </CardContent>
      </Card>

      {/* Récapitulatif */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Récapitulatif de votre demande</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Service</span>
            <span>{SERVICE_LABELS[service]}</span>
          </div>
          {model && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Modèle</span>
              <span>{model}</span>
            </div>
          )}
          {price > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Prix</span>
              <span className="font-medium">{formatFCFA(price)}</span>
            </div>
          )}
          {address && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Adresse</span>
              <span className="truncate">{address}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Support email */}
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground mb-2">
            Besoin d'aide ? Contactez notre équipe support :
          </p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-semibold">
              {settings?.supportEmail ?? 'contact@relioo.space'}
            </span>
            <Button variant="outline" size="sm" onClick={() => {
              navigator.clipboard.writeText(settings?.supportEmail ?? 'contact@relioo.space');
            }}>
              Copier
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Boutons d'action */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          onClick={() => router.push(`/suivi/ref/${encodeURIComponent(reference)}`)}
          className="flex-1"
        >
          <Icon name="arrow-right" size="sm" className="mr-2" />
          Suivre ma demande
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleWhatsApp}
          className="flex-1"
        >
          Envoyer par WhatsApp
        </Button>
      </div>

      {/* Paiement acompte — SMARTPHONE uniquement */}
      {service === 'SMARTPHONE' && depositAmount > 0 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <p className="text-sm font-semibold">Paiement de l'acompte</p>
            <p className="text-xs text-muted-foreground">
              Pour garantir votre réparation, un acompte de{' '}
              <span className="font-semibold text-orange-700">{formatFCFA(depositAmount)}</span>{' '}
              (50%) est requis. Le montant sera bloqué en toute sécurité.
            </p>
            <Button
              type="button"
              onClick={handlePayEscrow}
              isLoading={paying}
              disabled={paying}
              className="w-full bg-orange-500/90 py-3 text-sm font-bold text-white shadow-md shadow-orange-500/15 backdrop-blur-sm transition hover:bg-orange-500 disabled:opacity-60"
            >
              {paying ? 'Paiement en cours…' : 'Payer l\'acompte 50%'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
