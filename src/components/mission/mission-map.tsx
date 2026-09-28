'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

export interface MissionMapPoint {
  latitude: number;
  longitude: number;
}

export interface MissionMapProps {
  /** Lieu d'intervention (requis pour afficher la carte). */
  intervention: MissionMapPoint;
  /** Position récente du technicien (uniquement si fraîche, V3). */
  technician?: MissionMapPoint | null;
  onTileError?: () => void;
}

const LeafletMap = dynamic(
  () => import('./mission-map-inner').then((m) => m.MissionMapInner),
  {
    ssr: false,
    loading: () => <Skeleton className="h-56 w-full rounded-2xl sm:h-64" />,
  },
);

function isValidPoint(point: MissionMapPoint | null | undefined): point is MissionMapPoint {
  if (!point) return false;
  const { latitude, longitude } = point;
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/* GPS V4 — carte de mission (rendu Leaflet désactivé côté serveur).
 * Coordonnées invalides/absentes → aucun rendu (le parent affiche l'état
 * vide propre). Erreur de tuiles → message local, page intacte. */
export function MissionMap({ intervention, technician, onTileError }: MissionMapProps) {
  const [tileFailed, setTileFailed] = useState(false);
  if (!isValidPoint(intervention)) return null;
  if (tileFailed) {
    return (
      <Alert variant="neutral" dense>
        Carte temporairement indisponible. Les informations de localisation ci-dessous restent
        valables.
      </Alert>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
      <LeafletMap
        intervention={intervention}
        technician={isValidPoint(technician) ? technician : null}
        onTileError={() => {
          setTileFailed(true);
          onTileError?.();
        }}
      />
    </div>
  );
}
