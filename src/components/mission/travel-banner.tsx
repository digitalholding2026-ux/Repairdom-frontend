'use client';

import { Icon } from '@/components/ui/icon';
import { formatTravelDistance, formatTravelRecency } from '@/lib/travel-location';
import type { ClientTravelInfo } from '@/lib/api/request-service';

/* GPS V3 — bannière « technicien en route » du détail mission client.
 * Informations volontairement limitées : statut, fraîcheur et distance
 * approximative. JAMAIS de coordonnées brutes, JAMAIS d'historique. */

export function TravelBanner({ travel }: { travel: ClientTravelInfo | null | undefined }) {
  if (!travel || (!travel.enRoute && !travel.arrived)) return null;

  if (travel.arrived) {
    return (
      <div
        role="status"
        className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/5 p-4"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success/15 text-success-ink">
          <Icon name="check-circle" size="md" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Technicien arrivé sur place</p>
          <p className="text-xs text-muted-foreground">
            Le déplacement est terminé. Suivez l&apos;intervention dans la chronologie.
          </p>
        </div>
      </div>
    );
  }

  const recency = formatTravelRecency(travel.minutesSinceUpdate);
  const distance = travel.fresh ? formatTravelDistance(travel.distanceMeters) : null;

  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4"
    >
      <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <span
          aria-hidden
          className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/20"
        />
        <Icon name="truck" size="md" className="relative" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">Le technicien est en route vers votre intervention.</p>
        <p className="text-xs text-muted-foreground">
          {recency && distance
            ? `Dernière position reçue ${recency} · ${distance} du lieu d\u2019intervention.`
            : recency
              ? `Dernière position mise à jour ${recency}.`
              : 'Localisation momentanément indisponible.'}
        </p>
      </div>
    </div>
  );
}
