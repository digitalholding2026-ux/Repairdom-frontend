'use client';

import { useEffect, useState } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import { listCities } from '@/lib/api/cities-service';

/* ────────────────────────────────────────────────────────────────────────────
 * « Relio en chiffres » — CHIFFRES 100 % RÉELS, SANS AUCUNE VALEUR EN DUR.
 *
 * Même source et même règle que le bloc de la page d'accueil
 * (`components/landing/trust-stats.tsx`) : `GET /cities`, endpoint public,
 * aucun JWT.
 *
 *   villes couvertes = length(cities)
 *   zones couvertes  = somme de city.zones
 *
 * Si l'appel échoue ou renvoie une liste vide, ce composant ne rend RIEN :
 * aucun squelette figé, aucune valeur de repli. Une section « 0 ville » serait
 * pire qu'une section absente — elle afficherait un chiffre faux.
 *
 * C'est le SEUL fragment client de la page : le reste est un Server Component.
 * ──────────────────────────────────────────────────────────────────────────── */

type Stats = { cities: number; zones: number };

export function RecrutementStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;

    listCities()
      .then((cities) => {
        if (cancelled) return;
        if (cities.length === 0) {
          // Référentiel vide : on masque plutôt que d'écrire « 0 ville ».
          setStats(null);
          return;
        }
        const zones = cities.reduce((sum, city) => sum + (city.zones?.length ?? 0), 0);
        setStats({ cities: cities.length, zones });
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats) return null;

  const items: { label: string; value: string; icon: IconName }[] = [
    { label: 'Villes couvertes', value: String(stats.cities), icon: 'pin' },
    { label: 'Zones couvertes', value: String(stats.zones), icon: 'home' },
  ];

  return (
    <section aria-labelledby="chiffres-title" className="mx-auto w-full max-w-3xl px-4 py-12 md:py-16">
      <div className="text-center">
        <h2
          id="chiffres-title"
          className="text-3xl font-bold tracking-tight text-foreground md:text-4xl"
        >
          Relio en chiffres
        </h2>
        <p className="mx-auto mt-3 max-w-md text-base text-muted-foreground md:text-lg">
          La couverture réelle de nos zones d&apos;intervention, mise à jour par notre
          service.
        </p>
      </div>

      {/* Chiffres en grand, sans carte autour : sur deux nombres, un cadre
          zarrait davantage qu'il ne mettrait en valeur. Le filet vertical
          sépare les deux sans introduire de nouvelle surface. */}
      <dl className="mt-8 flex justify-center md:mt-12">
        {items.map((item, index) => (
          <div
            key={item.label}
            className={`flex-1 text-center ${index === 0 ? 'border-r border-border' : ''}`}
          >
            <span
              aria-hidden
              className="mx-auto flex size-10 items-center justify-center text-primary"
            >
              <Icon name={item.icon} size="md" />
            </span>
            <dd className="mt-2 text-5xl font-bold tracking-tight tabular-nums text-foreground md:text-6xl">
              {item.value}
            </dd>
            <dt className="mt-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {item.label}
            </dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
