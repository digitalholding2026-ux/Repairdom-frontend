'use client';

import { useEffect, useRef } from 'react';
import { LayersControl, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MissionMapProps } from './mission-map';

/* GPS V4 — rendu carte (Leaflet + tuiles OSM, aucune clé, aucune donnée
 * envoyée ailleurs que le fond de carte public). Marqueurs 100 % CSS
 * (divIcon) : aucun asset image, aucun chiffre de coordonnées affiché.
 *
 * GPS V4.1 — fond Relief (OpenTopoMap : tuiles gratuites, attribution
 * OSM + SRTM exigée et affichée, zoom max 17) avec bascule Plan/Relief
 * (contrôle Leaflet natif, zéro dépendance supplémentaire). En cas
 * d'échec des tuiles relief, le fond Plan reste disponible. */

function interventionIcon(): L.DivIcon {
  return L.divIcon({
    className: 'relio-map-pin',
    html: '<span class="relio-map-pin-dot"></span>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function technicianIcon(): L.DivIcon {
  return L.divIcon({
    className: 'relio-map-tech',
    html: '<span class="relio-map-tech-dot"></span>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }
    map.fitBounds(L.latLngBounds(points.map(([lat, lng]) => L.latLng(lat, lng))), {
      padding: [32, 32],
    });
  }, [map, points]);
  return null;
}

export function MissionMapInner({ intervention, technician, onTileError }: MissionMapProps & { onTileError: () => void }) {
  const points: Array<[number, number]> = [
    [intervention.latitude, intervention.longitude],
  ];
  if (technician) points.push([technician.latitude, technician.longitude]);
  /* GPS V4.1 — le repli « carte indisponible » ne se déclenche que pour la
   * couche de fond ACTIVE (ex. une tuile Relief manquante au-delà du zoom
   * 17 ne masque pas le fond Plan). Réf partagée : le tracker l'écrit, les
   * gestionnaires d'erreur la lisent. */
  const activeBaseLayer = useRef<string>('Plan');

  return (
    <div
      role="region"
      aria-label="Carte de la mission : lieu d'intervention et position récente du technicien"
    >
      <style>{`
        .relio-map-pin, .relio-map-tech { background: transparent; border: none; }
        .relio-map-pin-dot { display: block; width: 28px; height: 28px; border-radius: 9999px; background: #f97316; border: 3px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,.35); }
        .relio-map-tech-dot { display: block; width: 20px; height: 20px; margin: 4px; border-radius: 9999px; background: #2563eb; border: 3px solid #fff; box-shadow: 0 0 0 6px rgba(37,99,235,.25), 0 2px 8px rgba(0,0,0,.35); }
        .relio-map-wrap .leaflet-container { font: inherit; }
        /* GPS V4.1 — contrôle Plan/Relief compact : jamais hors carte,
         * marqueurs et attribution préservés sur petit écran. */
        .relio-map-wrap .leaflet-control-layers { font-size: 12px; }
      `}</style>
      <MapContainer
        center={[intervention.latitude, intervention.longitude]}
        zoom={15}
        scrollWheelZoom={false}
        className="relio-map-wrap h-56 w-full sm:h-64"
        attributionControl
      >
        <BaseLayerTracker activeRef={activeBaseLayer} />
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Plan">
            <TileLayer
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              eventHandlers={{ tileerror: () => { if (activeBaseLayer.current === 'Plan') onTileError(); } }}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Relief">
            <TileLayer
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              maxZoom={17}
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, SRTM | style <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)'
              eventHandlers={{ tileerror: () => { if (activeBaseLayer.current === 'Relief') onTileError(); } }}
            />
          </LayersControl.BaseLayer>
        </LayersControl>
        <FitBounds points={points} />
        <Marker position={[intervention.latitude, intervention.longitude]} icon={interventionIcon()} />
        {technician ? (
          <Marker position={[technician.latitude, technician.longitude]} icon={technicianIcon()} />
        ) : null}
      </MapContainer>
    </div>
  );
}

/* Suit la couche de fond active (contrôle Leaflet natif, clavier + focus
 * visibles d'origine) pour le repli d'erreur ciblé. */
function BaseLayerTracker({ activeRef }: { activeRef: { current: string } }) {
  const map = useMap();
  useEffect(() => {
    const onChange = (event: L.LayersControlEvent) => {
      activeRef.current = event.name;
    };
    map.on('baselayerchange', onChange);
    return () => {
      map.off('baselayerchange', onChange);
    };
  }, [map, activeRef]);
  return null;
}
