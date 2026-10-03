'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Icon } from '@/components/ui/icon';
import { usePush } from '@/lib/push/use-push';

/* Carte d'opt-in push (design system : Card + Button + Alert).
 * États : non supporté / iOS à installer / refusé / inactif / activé.
 * Jamais de demande automatique : uniquement sur clic « Activer ».
 * `compact` : version inline (confirmation, mission acceptée). */

const STATUS_LABEL: Record<string, string> = {
  unsupported: 'Non supporté par ce navigateur',
  unsupported_ios_needs_install:
    'Ajoutez Relio à votre écran d’accueil pour recevoir les notifications',
  denied: 'Notifications refusées dans le navigateur',
  off: 'Désactivées',
  subscribed: 'Activées',
};

export function PushNotificationCard({ compact = false }: { compact?: boolean }) {
  const { state, busy, error, enable, disable, test } = usePush();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon name="bell" size="sm" />
          Notifications push
        </CardTitle>
        <CardDescription>
          {compact
            ? 'Suivez votre mission en temps réel, même app fermée.'
            : 'Recevez les événements importants (devis, arrivée du technicien, nouvelles missions), même quand l’app est fermée.'}{' '}
          État : {STATUS_LABEL[state] ?? state}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? <Alert variant="error">{error}</Alert> : null}
        {state === 'subscribed' ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void disable()}
              disabled={busy}
              className="flex-1"
            >
              Désactiver
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void test()}
              disabled={busy}
              className="flex-1"
            >
              Tester les notifications
            </Button>
          </div>
        ) : state === 'off' ? (
          <Button size="sm" onClick={() => void enable()} disabled={busy} className="w-full">
            Activer les notifications push
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            {state === 'denied'
              ? 'Autorisez les notifications dans les paramètres de votre navigateur, puis revenez ici.'
              : STATUS_LABEL[state] ?? null}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
