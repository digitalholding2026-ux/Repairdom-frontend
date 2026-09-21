'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { SkeletonCard } from '@/components/ui/skeleton';
import { TechnicianDemandeCard } from '@/components/technician/technician-demande-card';
import {
  listAvailableDemandes,
  type TechnicianDemande,
} from '@/lib/api/technician-service';

type SortKey = 'RELEVANT' | 'NEWEST' | 'OLDEST' | 'REQUESTED';

const SORT_LABELS: Record<SortKey, string> = {
  RELEVANT: 'Pertinence (dÃ¨s que possible dâ€™abord)',
  NEWEST: 'Plus rÃ©centes',
  OLDEST: 'Plus anciennes',
  REQUESTED: 'Date dâ€™intervention',
};

function isAsap(demande: TechnicianDemande): boolean {
  return demande.requestedMode === 'ASAP';
}

/* Tri Â« pertinence Â» : miroir de la prioritÃ© backend (dÃ¨s que possible
 * dâ€™abord, puis plus rÃ©cent dâ€™abord). Tri 100 % client : lâ€™API
 * GET /technician/available ne supporte ni pagination ni tri serveur. */
function compareRelevant(a: TechnicianDemande, b: TechnicianDemande): number {
  const aAsap = isAsap(a);
  const bAsap = isAsap(b);
  if (aAsap !== bAsap) return aAsap ? -1 : 1;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function compareRequested(a: TechnicianDemande, b: TechnicianDemande): number {
  const aTime = a.requestedAt ? new Date(a.requestedAt).getTime() : Number.POSITIVE_INFINITY;
  const bTime = b.requestedAt ? new Date(b.requestedAt).getTime() : Number.POSITIVE_INFINITY;
  if (aTime !== bTime) return aTime - bTime;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

const SORTERS: Record<SortKey, (a: TechnicianDemande, b: TechnicianDemande) => number> = {
  RELEVANT: compareRelevant,
  NEWEST: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  OLDEST: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  REQUESTED: compareRequested,
};

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function TechnicienMissionsDisponiblesPage() {
  const [missions, setMissions] = useState<TechnicianDemande[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('ALL');
  const [city, setCity] = useState('ALL');
  const [mode, setMode] = useState('ALL');
  const [sort, setSort] = useState<SortKey>('RELEVANT');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setMissions(await listAvailableDemandes());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des missions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  /* Options construites UNIQUEMENT Ã  partir des donnÃ©es rÃ©ellement reÃ§ues
   * (aucune catÃ©gorie/ville supposÃ©e cÃ´tÃ© frontend). */
  const categories = useMemo(() => {
    const byId = new Map<string, string>();
    for (const mission of missions) {
      if (!byId.has(mission.categoryId)) byId.set(mission.categoryId, mission.categoryLabel);
    }
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1], 'fr'));
  }, [missions]);

  const cities = useMemo(() => {
    const unique = new Set<string>();
    for (const mission of missions) {
      if (mission.city.trim()) unique.add(mission.city.trim());
    }
    return [...unique].sort((a, b) => a.localeCompare(b, 'fr'));
  }, [missions]);

  const filtered = useMemo(() => {
    const needle = normalize(query);
    return missions
      .filter((mission) => {
        if (categoryId !== 'ALL' && mission.categoryId !== categoryId) return false;
        if (city !== 'ALL' && mission.city.trim() !== city) return false;
        if (mode !== 'ALL' && mission.requestedMode !== mode) return false;
        if (needle) {
          const haystack = normalize(
            `${mission.reference} ${mission.categoryLabel} ${mission.description} ${mission.city}`,
          );
          if (!haystack.includes(needle)) return false;
        }
        return true;
      })
      .sort(SORTERS[sort]);
  }, [missions, query, categoryId, city, mode, sort]);

  const hasActiveFilters =
    query.trim() !== '' || categoryId !== 'ALL' || city !== 'ALL' || mode !== 'ALL';

  const resetFilters = () => {
    setQuery('');
    setCategoryId('ALL');
    setCity('ALL');
    setMode('ALL');
  };

  if (loading) {
    return (
      <div className="space-y-4" role="status">
        <span className="sr-only">Chargement des missions disponiblesâ€¦</span>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Missions disponibles"
        description="Missions correspondant Ã  votre profil, votre ville et vos zones couvertes. Les dÃ©tails du client restent masquÃ©s avant acceptation."
        backHref="/technicien"
        actions={
          <Badge variant={filtered.length > 0 ? 'info' : 'neutral'}>
            {filtered.length} mission{filtered.length !== 1 ? 's' : ''}
          </Badge>
        }
      />

      {error ? (
        <div className="space-y-3">
          <Alert variant="error">{error}</Alert>
          <Button variant="secondary" className="w-full" onClick={() => void load()}>
            RÃ©essayer
          </Button>
        </div>
      ) : null}

      {!error && missions.length === 0 ? (
        <EmptyState
          icon={<Icon name="search" size="lg" />}
          title="Aucune mission disponible"
          description="Il nâ€™y a pas de mission correspondant Ã  votre profil et votre zone pour le moment. Pensez Ã  vÃ©rifier votre disponibilitÃ©."
          action={
            <Link href="/technicien#disponibilite">
              <Button variant="secondary">GÃ©rer ma disponibilitÃ©</Button>
            </Link>
          }
        />
      ) : null}

      {!error && missions.length > 0 ? (
        <>
          {/* â”€â”€ Filtres (donnÃ©es rÃ©elles uniquement) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <section aria-label="Filtres des missions" className="space-y-3">
            <div>
              <label htmlFor="missions-search" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Rechercher
              </label>
              <Input
                id="missions-search"
                type="search"
                placeholder="RÃ©fÃ©rence, mot-clÃ©, villeâ€¦"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="missions-category" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  CatÃ©gorie
                </label>
                <Select
                  id="missions-category"
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                >
                  <option value="ALL">Toutes les catÃ©gories</option>
                  {categories.map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label htmlFor="missions-city" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Ville
                </label>
                <Select
                  id="missions-city"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                >
                  <option value="ALL">Toutes les villes</option>
                  {cities.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label htmlFor="missions-mode" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Urgence
                </label>
                <Select
                  id="missions-mode"
                  value={mode}
                  onChange={(event) => setMode(event.target.value)}
                >
                  <option value="ALL">Toutes</option>
                  <option value="ASAP">DÃ¨s que possible</option>
                  <option value="SCHEDULED">PlanifiÃ©e</option>
                </Select>
              </div>
              <div>
                <label htmlFor="missions-sort" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Trier par
                </label>
                <Select
                  id="missions-sort"
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortKey)}
                >
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                    <option key={key} value={key}>
                      {SORT_LABELS[key]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            {hasActiveFilters ? (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <Icon name="x" size="sm" />
                <span className="ml-1">RÃ©initialiser les filtres</span>
              </Button>
            ) : null}
          </section>

          {/* â”€â”€ RÃ©sultats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Icon name="search" size="lg" />}
              title="Aucun rÃ©sultat"
              description="Aucune mission ne correspond Ã  ces filtres. Essayez dâ€™Ã©largir votre recherche."
              action={
                <Button variant="secondary" onClick={resetFilters}>
                  RÃ©initialiser les filtres
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((mission) => (
                <TechnicianDemandeCard
                  key={mission.id}
                  demande={mission}
                  detailHref={`/technicien/demandes/${mission.id}`}
                />
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
