'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Icon } from '@/components/ui/icon';
import { Alert } from '@/components/ui/alert';
import { Field, Input } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { Switch } from '@/components/ui/switch';
import { CatalogSkeleton } from '@/components/admin/catalog/catalog-skeleton';
import { DeleteCatalogItem } from '@/components/admin/catalog/delete-catalog-item';
import { useToast } from '@/lib/toast-context';
import {
  listAdminCities,
  createAdminCity,
  updateAdminCity,
  deleteAdminCity,
  listAdminZones,
  createAdminZone,
  updateAdminZone,
  deleteAdminZone,
  type ServiceCity,
  type ServiceZone,
  type CatalogDeleteOutcome,
} from '@/lib/api/admin-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';

/* Référentiel géographique admin (ServiceCity / Zone).
 * Contrats : GET/POST/PATCH/DELETE /admin/catalog/cities,
 * GET /admin/catalog/cities/:cityId/zones, POST/PATCH/DELETE /admin/catalog/zones.
 * Suppression physique sans dépendance, désactivation (isActive) sinon —
 * l'historique (demandes, comptes, couvertures) n'est jamais détruit. La liste
 * des villes ne fournit aucun compteur de zones (aucune requête N+1 ici : les
 * zones sont chargées uniquement pour la ville sélectionnée), la ville d'une
 * zone est fixée à la création. */

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function parseSortOrder(raw: string): number | undefined {
  if (raw.trim() === '') return undefined;
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 0) return undefined;
  return value;
}

export default function AdminVillesPage() {
  const { toast } = useToast();
  const [cities, setCities] = useState<ServiceCity[]>([]);
  const [zones, setZones] = useState<ServiceZone[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zonesError, setZonesError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [cityModal, setCityModal] = useState<{ mode: 'create' } | { mode: 'edit'; city: ServiceCity } | null>(null);
  const [cityName, setCityName] = useState('');
  const [citySlug, setCitySlug] = useState('');
  const [citySortOrder, setCitySortOrder] = useState('');
  const [cityActive, setCityActive] = useState(true);
  const [cityBusy, setCityBusy] = useState(false);

  const [zoneModal, setZoneModal] = useState<{ mode: 'create' } | { mode: 'edit'; zone: ServiceZone } | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [zoneSlug, setZoneSlug] = useState('');
  const [zoneSortOrder, setZoneSortOrder] = useState('');
  const [zoneActive, setZoneActive] = useState(true);
  const [zoneBusy, setZoneBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAdminCities()
      .then((data) => {
        if (cancelled) return;
        setCities(data);
        setError(null);
        setSelectedCityId((prev) => (prev && data.some((c) => c.id === prev) ? prev : null));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur de chargement.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!selectedCityId) {
      setZones([]);
      return;
    }
    let cancelled = false;
    setZonesLoading(true);
    listAdminZones(selectedCityId)
      .then((data) => {
        if (!cancelled) {
          setZones(data);
          setZonesError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setZonesError(err instanceof Error ? err.message : 'Erreur de chargement des zones.');
      })
      .finally(() => {
        if (!cancelled) setZonesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCityId, reloadKey]);

  const selectedCity = cities.find((city) => city.id === selectedCityId) ?? null;

  const filteredCities = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return cities;
    return cities.filter(
      (city) => city.name.toLowerCase().includes(needle) || city.slug.toLowerCase().includes(needle),
    );
  }, [cities, search]);

  const openCityCreate = () => {
    setCityName('');
    setCitySlug('');
    setCitySortOrder('');
    setCityActive(true);
    setCityModal({ mode: 'create' });
  };

  const openCityEdit = (city: ServiceCity) => {
    setCityName(city.name);
    setCitySlug(city.slug);
    setCitySortOrder(String(city.sortOrder));
    setCityActive(city.isActive);
    setCityModal({ mode: 'edit', city });
  };

  const handleCitySave = async () => {
    if (!cityModal || cityBusy) return;
    const name = cityName.trim();
    const slug = citySlug.trim().toLowerCase() || slugify(name);
    if (!name || !slug) return;
    const sortOrder = parseSortOrder(citySortOrder);
    setCityBusy(true);
    try {
      if (cityModal.mode === 'create') {
        await createAdminCity({ name, slug, isActive: cityActive, ...(sortOrder !== undefined ? { sortOrder } : {}) });
        toast({ title: 'Ville créée', variant: 'success' });
      } else {
        await updateAdminCity(cityModal.city.id, {
          name,
          slug,
          isActive: cityActive,
          ...(sortOrder !== undefined ? { sortOrder } : {}),
        });
        toast({ title: 'Ville mise à jour', variant: 'success' });
      }
      setCityModal(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      const message = toUserErrorMessage(err, 'Erreur lors de l’enregistrement.');
      setError(message);
      toast({ title: 'Erreur', description: message, variant: 'error' });
    } finally {
      setCityBusy(false);
    }
  };

  const openZoneCreate = () => {
    setZoneName('');
    setZoneSlug('');
    setZoneSortOrder('');
    setZoneActive(true);
    setZoneModal({ mode: 'create' });
  };

  const openZoneEdit = (zone: ServiceZone) => {
    setZoneName(zone.name);
    setZoneSlug(zone.slug);
    setZoneSortOrder(String(zone.sortOrder));
    setZoneActive(zone.isActive);
    setZoneModal({ mode: 'edit', zone });
  };

  const handleZoneSave = async () => {
    if (!zoneModal || zoneBusy || !selectedCity) return;
    const name = zoneName.trim();
    const slug = zoneSlug.trim().toLowerCase() || slugify(name);
    if (!name || !slug) return;
    const sortOrder = parseSortOrder(zoneSortOrder);
    setZoneBusy(true);
    try {
      if (zoneModal.mode === 'create') {
        await createAdminZone({
          cityId: selectedCity.id,
          name,
          slug,
          isActive: zoneActive,
          ...(sortOrder !== undefined ? { sortOrder } : {}),
        });
        toast({ title: 'Zone créée', variant: 'success' });
      } else {
        await updateAdminZone(zoneModal.zone.id, {
          name,
          slug,
          isActive: zoneActive,
          ...(sortOrder !== undefined ? { sortOrder } : {}),
        });
        toast({ title: 'Zone mise à jour', variant: 'success' });
      }
      setZoneModal(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      const message = toUserErrorMessage(err, 'Erreur lors de l’enregistrement.');
      setZonesError(message);
      toast({ title: 'Erreur', description: message, variant: 'error' });
    } finally {
      setZoneBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Villes et zones"
        description="Référentiel géographique Relio : villes de service et leurs zones."
        backHref="/admin/catalog"
        actions={
          <Button variant="ghost" size="sm" onClick={openCityCreate}>
            <Icon name="plus" size="3.5" />
            Ville
          </Button>
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div>
        <label htmlFor="geo-city-search" className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Rechercher une ville
        </label>
        <Input
          id="geo-city-search"
          type="search"
          placeholder="Nom ou slug…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
        />
      </div>

      {loading ? (
        <CatalogSkeleton />
      ) : filteredCities.length === 0 ? (
        <EmptyState
          icon={<Icon name="pin" size="lg" />}
          title={cities.length === 0 ? 'Aucune ville' : 'Aucun résultat'}
          description={
            cities.length === 0
              ? 'Créez la première ville du référentiel.'
              : 'Aucune ville ne correspond à cette recherche.'
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <section aria-label="Villes" className="space-y-2">
            <SectionHeader title="Villes" />
            {filteredCities.map((city) => {
              const selected = city.id === selectedCityId;
              return (
                <Card key={city.id} className={selected ? 'border-primary/60 bg-primary/5' : undefined}>
                  <CardContent className="flex items-center justify-between gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setSelectedCityId(selected ? null : city.id)}
                      aria-pressed={selected}
                      aria-label={`Voir les zones de ${city.name}`}
                      className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold">{city.name}</p>
                        <Badge variant={city.isActive ? 'success' : 'neutral'}>
                          {city.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{city.slug}</p>
                    </button>
                    <span className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openCityEdit(city)}
                        aria-label={`Modifier ${city.name}`}
                      >
                        Modifier
                      </Button>
                      <DeleteCatalogItem
                        itemLabel={city.name}
                        onDelete={() => deleteAdminCity(city.id)}
                        onDone={(outcome: CatalogDeleteOutcome | null, err: string | null) => {
                          if (err) {
                            setError(err);
                            toast({ title: 'Erreur', description: err, variant: 'error' });
                          } else if (outcome) {
                            toast({ title: outcome.action === 'DELETED' ? 'Ville supprimée' : 'Ville désactivée', description: outcome.message, variant: 'success' });
                          }
                          setReloadKey((k) => k + 1);
                        }}
                      />
                      <Icon name="chevron-right" size="sm" className="text-muted-foreground" />
                    </span>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <section aria-label="Zones" className="space-y-2">
            <SectionHeader
              title={selectedCity ? `Zones — ${selectedCity.name}` : 'Zones'}
              action={
                selectedCity ? (
                  <Button variant="ghost" size="sm" onClick={openZoneCreate}>
                    <Icon name="plus" size="3.5" />
                    Zone
                  </Button>
                ) : null
              }
            />
            {!selectedCity ? (
              <p className="text-sm text-muted-foreground">
                Sélectionnez une ville pour voir et gérer ses zones.
              </p>
            ) : zonesLoading ? (
              <CatalogSkeleton />
            ) : (
              <>
                {zonesError ? <Alert variant="error">{zonesError}</Alert> : null}
                {zones.length === 0 && !zonesError ? (
                  <EmptyState
                    icon={<Icon name="pin" size="lg" />}
                    title="Aucune zone"
                    description={`Aucune zone pour ${selectedCity.name} pour le moment.`}
                  />
                ) : (
                  zones.map((zone) => (
                    <Card key={zone.id}>
                      <CardContent className="flex items-center justify-between gap-3 pt-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold">{zone.name}</p>
                            <Badge variant={zone.isActive ? 'success' : 'neutral'}>
                              {zone.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{zone.slug}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => openZoneEdit(zone)} aria-label={`Modifier ${zone.name}`}>
                          Modifier
                        </Button>
                        <DeleteCatalogItem
                          itemLabel={zone.name}
                          onDelete={() => deleteAdminZone(zone.id)}
                          onDone={(outcome: CatalogDeleteOutcome | null, err: string | null) => {
                            if (err) {
                              setZonesError(err);
                              toast({ title: 'Erreur', description: err, variant: 'error' });
                            } else if (outcome) {
                              toast({ title: outcome.action === 'DELETED' ? 'Zone supprimée' : 'Zone désactivée', description: outcome.message, variant: 'success' });
                            }
                            setReloadKey((k) => k + 1);
                          }}
                        />
                      </CardContent>
                    </Card>
                  ))
                )}
              </>
            )}
          </section>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Suppression physique sans dépendance, désactivation sinon : une ville ou une zone
        référencée (demande, compte, couverture) reste conservée dans l&apos;historique. Une zone
        reste toujours rattachée à sa ville de création.
      </p>

      <Modal
        open={cityModal !== null}
        onClose={() => setCityModal(null)}
        title={cityModal?.mode === 'edit' ? 'Modifier la ville' : 'Nouvelle ville'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCityModal(null)} disabled={cityBusy}>
              Annuler
            </Button>
            <Button onClick={handleCitySave} isLoading={cityBusy} disabled={!cityName.trim()}>
              {cityModal?.mode === 'edit' ? 'Enregistrer' : 'Créer'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Nom" htmlFor="geo-city-name" required>
            <Input id="geo-city-name" value={cityName} onChange={(e) => setCityName(e.target.value)} placeholder="Ex. : Douala" maxLength={100} />
          </Field>
          <Field label="Slug" htmlFor="geo-city-slug" hint="Généré automatiquement si vide. Unique.">
            <Input id="geo-city-slug" value={citySlug} onChange={(e) => setCitySlug(e.target.value.toLowerCase())} placeholder="douala" maxLength={100} />
          </Field>
          <Field label="Ordre d’affichage" htmlFor="geo-city-order" hint="Nombre entier ≥ 0 (optionnel).">
            <Input id="geo-city-order" value={citySortOrder} onChange={(e) => setCitySortOrder(e.target.value)} inputMode="numeric" placeholder="0" />
          </Field>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3.5 py-2.5">
            <span className="text-sm font-medium" id="geo-city-active-label">Ville active</span>
            <Switch checked={cityActive} onCheckedChange={setCityActive} aria-labelledby="geo-city-active-label" />
          </div>
        </div>
      </Modal>

      <Modal
        open={zoneModal !== null}
        onClose={() => setZoneModal(null)}
        title={zoneModal?.mode === 'edit' ? 'Modifier la zone' : 'Nouvelle zone'}
        description={selectedCity ? `Rattachée à ${selectedCity.name} (non modifiable).` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setZoneModal(null)} disabled={zoneBusy}>
              Annuler
            </Button>
            <Button onClick={handleZoneSave} isLoading={zoneBusy} disabled={!zoneName.trim()}>
              {zoneModal?.mode === 'edit' ? 'Enregistrer' : 'Créer'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Nom" htmlFor="geo-zone-name" required>
            <Input id="geo-zone-name" value={zoneName} onChange={(e) => setZoneName(e.target.value)} placeholder="Ex. : Akwa" maxLength={150} />
          </Field>
          <Field label="Slug" htmlFor="geo-zone-slug" hint="Généré automatiquement si vide. Unique au sein de la ville.">
            <Input id="geo-zone-slug" value={zoneSlug} onChange={(e) => setZoneSlug(e.target.value.toLowerCase())} placeholder="akwa" maxLength={150} />
          </Field>
          <Field label="Ordre d’affichage" htmlFor="geo-zone-order" hint="Nombre entier ≥ 0 (optionnel).">
            <Input id="geo-zone-order" value={zoneSortOrder} onChange={(e) => setZoneSortOrder(e.target.value)} inputMode="numeric" placeholder="0" />
          </Field>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3.5 py-2.5">
            <span className="text-sm font-medium" id="geo-zone-active-label">Zone active</span>
            <Switch checked={zoneActive} onCheckedChange={setZoneActive} aria-labelledby="geo-zone-active-label" />
          </div>
        </div>
      </Modal>

      <div className="sr-only" aria-live="polite">
        {selectedCity ? `Ville sélectionnée : ${selectedCity.name}, ${zones.length} zones.` : 'Aucune ville sélectionnée.'}
      </div>
    </div>
  );
}
