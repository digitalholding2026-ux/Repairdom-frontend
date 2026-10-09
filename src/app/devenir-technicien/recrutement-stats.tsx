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
    <section aria-labelledby="chiffres-title" className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
        <div className="text-center">
          <h2
            id="chiffres-title"
            className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl"
          >
            Relio en chiffres
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            La couverture réelle de nos zones d&apos;intervention, mise à jour par notre
            service.
          </p>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3">
          {items.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl bg-slate-50 p-4 text-center sm:p-5"
            >
              <span
                aria-hidden
                className="mx-auto flex size-10 items-center justify-center rounded-full bg-white text-orange-600 shadow-sm"
              >
                <Icon name={item.icon} size="sm" />
              </span>
              <dd className="mt-2 text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 sm:text-3xl">
                {item.value}
              </dd>
              <dt className="mt-0.5 text-xs font-medium text-slate-500">{item.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
