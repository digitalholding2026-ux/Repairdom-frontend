'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/lib/cn';
import { formatFCFA } from '@/lib/format-fcfa';
import {
  listCategories,
  listItems,
  listServices,
  type CatalogCategoryLite,
  type CatalogItemLite,
  type CatalogServiceLite,
} from '@/lib/api/catalog-service';

/** Sélection remontée au parent (label + montant retenu, null = sur devis). */
export interface CatalogSelection {
  serviceCode: string;
  serviceLabel: string;
  categoryId: string;
  categoryLabel: string;
  itemId: string;
  itemLabel: string;
  price: number | null;
  surDevis: boolean;
}

interface CatalogServicePickerProps {
  onSelect?: (selection: CatalogSelection) => void;
}

/* M1 — parcours catalogue v2 branché sur /api/services : choix de la prestation
 * (3 cartes), puis de la catégorie, puis de la prestation détaillée avec son
 * prix. Le tarif n'est jamais choisi ici : le serveur renvoie déjà le montant
 * public ou professionnel selon la session. Un montant null s'affiche « sur
 * devis ». */
export function CatalogServicePicker({ onSelect }: CatalogServicePickerProps) {
  const [services, setServices] = useState<CatalogServiceLite[]>([]);
  const [categories, setCategories] = useState<CatalogCategoryLite[]>([]);
  const [items, setItems] = useState<CatalogItemLite[]>([]);

  const [service, setService] = useState<CatalogServiceLite | null>(null);
  const [category, setCategory] = useState<CatalogCategoryLite | null>(null);
  const [item, setItem] = useState<CatalogItemLite | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listServices()
      .then((result) => {
        if (!cancelled) setServices(result);
      })
      .catch(() => {
        if (!cancelled) setError('Prestations momentanément indisponibles.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function chooseService(next: CatalogServiceLite) {
    setService(next);
    setCategory(null);
    setItem(null);
    setItems([]);
    setError(null);
    onEmit(next, null, null);
    try {
      setCategories(await listCategories(next.code));
    } catch {
      setError("Catégories momentanément indisponibles.");
    }
  }

  async function chooseCategory(next: CatalogCategoryLite) {
    setCategory(next);
    setItem(null);
    setError(null);
    onEmit(service, next, null);
    try {
      setItems(await listItems(service?.code ?? '', next.id));
    } catch {
      setError('Prestations momentanément indisponibles.');
    }
  }

  function chooseItem(next: CatalogItemLite) {
    setItem(next);
    onEmit(service, category, next);
  }

  function onEmit(
    svc: CatalogServiceLite | null,
    cat: CatalogCategoryLite | null,
    it: CatalogItemLite | null,
  ) {
    if (!svc || !cat || !it || !onSelect) return;
    onSelect({
      serviceCode: svc.code,
      serviceLabel: svc.label,
      categoryId: cat.id,
      categoryLabel: cat.label,
      itemId: it.id,
      itemLabel: it.label,
      price: it.price,
      surDevis: it.surDevis,
    });
  }

  const priceLabel = useMemo(() => {
    if (!item) return null;
    return item.surDevis ? 'Sur devis — vous serez contacté' : formatFCFA(item.price);
  }, [item]);

  return (
    <section className="space-y-4" aria-label="Choix du service">
      <div>
        <p className="text-base font-semibold">De quoi avez-vous besoin&nbsp;?</p>
        <p className="text-sm text-muted-foreground">
          Choisissez une prestation, puis sa catégorie et l&apos;opération souhaitée.
        </p>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" aria-hidden>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {services.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => chooseService(entry)}
              className={cn(
                'rounded-xl border p-3 text-left transition-colors',
                service?.code === entry.code
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/60',
              )}
            >
              <span className="block text-sm font-semibold">{entry.label}</span>
              {entry.description ? (
                <span className="block text-xs text-muted-foreground">{entry.description}</span>
              ) : null}
            </button>
          ))}
        </div>
      )}

      {service && categories.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {categories.map((entry) => (
            <Button
              key={entry.id}
              type="button"
              variant={category?.id === entry.id ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => chooseCategory(entry)}
            >
              {entry.label}
            </Button>
          ))}
        </div>
      ) : null}

      {category && items.length > 0 ? (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {items.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => chooseItem(entry)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 p-3 text-left',
                  item?.id === entry.id ? 'bg-primary/5' : 'hover:bg-muted/40',
                )}
              >
                <span className="text-sm">
                  {entry.label}
                  {entry.androidVersion ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      Android {entry.androidVersion}
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    'shrink-0 text-sm font-medium',
                    entry.surDevis ? 'text-muted-foreground' : 'text-foreground',
                  )}
                >
                  {entry.surDevis ? 'Sur devis' : formatFCFA(entry.price)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {priceLabel ? (
        <p className="text-sm font-semibold" aria-live="polite">
          {item?.label}&nbsp;: {priceLabel}
        </p>
      ) : null}
    </section>
  );
}
