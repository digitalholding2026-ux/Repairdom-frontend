'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useToast } from '@/lib/toast-context';
import { listCities, type City } from '@/lib/api/cities-service';
import {
  getTechnicianProfile,
  getTechnicianCoverage,
  updateTechnicianCoverage,
  type TechnicianCoverage,
  type TechnicianProfile,
} from '@/lib/api/technician-service';

function normalizeCityName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function TechnicienZonesPage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [coverage, setCoverage] = useState<TechnicianCoverage[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [mutating, setMutating] = useState(false);
  const [zoneToRemove, setZoneToRemove] = useState<TechnicianCoverage | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [p, c, list] = await Promise.all([
          getTechnicianProfile(),
          getTechnicianCoverage(),
          listCities(),
        ]);
        if (cancelled) return;
        setProfile(p);
        setCoverage(c);
        setCities(list);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur de chargement.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Ville de référence : cityId structuré d’abord, repli tolérant sur le
   * texte. Sans rattachement, le backend refuse toute couverture (400). */
  const referenceCity = useMemo<City | null>(() => {
    if (!profile) return null;
    if (profile.cityId) {
      return cities.find((city) => city.id === profile.cityId) ?? null;
    }
    return (
      cities.find(
        (city) => normalizeCityName(city.name) === normalizeCityName(profile.city),
      ) ?? null
    );
  }, [profile, cities]);

  const coveredIds = useMemo(() => new Set(coverage.map((entry) => entry.zoneId)), [coverage]);

  /* Ajout limité aux zones ACTIVES de ma ville (fournies par GET /cities),
   * hors zones déjà couvertes. Jamais d’autre ville, jamais de saisie libre. */
  const addableZones = useMemo(() => {
    if (!referenceCity) return [];
    return (referenceCity.zones ?? []).filter((zone) => !coveredIds.has(zone.id));
  }, [referenceCity, coveredIds]);

  /* La sélection ne doit jamais porter sur une zone déjà couverte
   * (le backend rejette les doublons) : purger après chaque mutation. */
  useEffect(() => {
    if (selectedZoneId && !addableZones.some((zone) => zone.id === selectedZoneId)) {
      setSelectedZoneId('');
    }
  }, [addableZones, selectedZoneId]);

  const handleAdd = async () => {
    if (!selectedZoneId || mutating) return;
    setMutating(true);
    setError(null);
    try {
      const updated = await updateTechnicianCoverage([...coveredIds, selectedZoneId]);
      setCoverage(updated);
      setSelectedZoneId('');
      toast({ title: 'Zone ajoutée', description: 'Votre couverture a été mise à jour.', variant: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l’ajout.';
      setError(message);
      toast({ title: 'Erreur', description: message, variant: 'error' });
    } finally {
      setMutating(false);
    }
  };

  const handleRemove = async () => {
    if (!zoneToRemove || mutating) return;
    setMutating(true);
    setError(null);
    try {
      const remaining = coverage
        .map((entry) => entry.zoneId)
        .filter((zoneId) => zoneId !== zoneToRemove.zoneId);
      const updated = await updateTechnicianCoverage(remaining);
      setCoverage(updated);
      setZoneToRemove(null);
      toast({ title: 'Zone retirée', description: 'Votre couverture a été mise à jour.', variant: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du retrait.';
      setError(message);
      toast({ title: 'Erreur', description: message, variant: 'error' });
    } finally {
      setMutating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4" role="status">
        <span className="sr-only">Chargement des zones couvertes…</span>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Zones couvertes"
        description="Ces zones indiquent où vous souhaitez être pris en compte pour les nouvelles missions."
        backHref="/technicien/profil"
        actions={
          <Badge variant={coverage.length > 0 ? 'info' : 'neutral'}>
            {coverage.length} zone{coverage.length !== 1 ? 's' : ''}
          </Badge>
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      {!profile || !referenceCity ? (
        <EmptyState
          icon={<Icon name="pin" size="lg" />}
          title="Ville de référence requise"
          description={
            profile
              ? `Votre ville « ${profile.city} » n’est pas rattachée au référentiel. Choisissez d’abord votre ville dans votre profil pour gérer vos zones.`
              : 'Chargez votre profil pour gérer vos zones couvertes.'
          }
          action={
            <Link href="/technicien/profil">
              <Button variant="secondary">Aller à mon profil</Button>
            </Link>
          }
        />
      ) : (
        <>
          <section className="space-y-3">
            <SectionHeader
              title="Ville de référence"
              description={`Seules les zones de ${referenceCity.name} peuvent être sélectionnées.`}
            />
            <Card>
              <CardContent className="flex items-center gap-3 pt-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon name="pin" size="sm" />
                </span>
                <p className="text-sm font-semibold">{referenceCity.name}</p>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-3">
            <SectionHeader title="Ajouter une zone" />
            {addableZones.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Toutes les zones actives de votre ville sont déjà couvertes.
              </p>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select
                  id="zone-select"
                  aria-label="Zone à ajouter"
                  value={selectedZoneId}
                  onChange={(e) => setSelectedZoneId(e.target.value)}
                  disabled={mutating}
                  className="sm:flex-1"
                >
                  <option value="">Sélectionnez une zone</option>
                  {addableZones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </Select>
                <Button onClick={handleAdd} isLoading={mutating} disabled={!selectedZoneId} className="sm:w-auto">
                  <Icon name="plus" size="sm" />
                  <span className="ml-1">Ajouter</span>
                </Button>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <SectionHeader title="Mes zones" />
            {coverage.length === 0 ? (
              <EmptyState
                icon={<Icon name="pin" size="lg" />}
                title="Aucune zone couverte pour le moment."
                description="Ajoutez ci-dessus les zones où vous souhaitez intervenir."
              />
            ) : (
              <div className="space-y-2">
                {coverage.map((entry) => (
                  <Card key={entry.zoneId}>
                    <CardContent className="flex items-center gap-3 pt-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold">{entry.name}</p>
                          <Badge variant={entry.isActive ? 'success' : 'neutral'}>
                            {entry.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {entry.city.name}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setZoneToRemove(entry)}
                        disabled={mutating}
                        aria-label={`Retirer la zone ${entry.name}`}
                      >
                        <Icon name="x" size="sm" />
                        <span className="ml-1 hidden sm:inline">Retirer</span>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <ConfirmDialog
        open={zoneToRemove !== null}
        onCancel={() => setZoneToRemove(null)}
        onConfirm={handleRemove}
        loading={mutating}
        tone="danger"
        title="Retirer cette zone ?"
        description={
          zoneToRemove
            ? `Vous ne serez plus pris en compte pour les nouvelles missions à « ${zoneToRemove.name} ».`
            : undefined
        }
        confirmLabel="Retirer"
      />
    </div>
  );
}
