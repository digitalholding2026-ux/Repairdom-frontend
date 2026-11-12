'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { formatCurrency } from '@/lib/format';
import {
  listCategories,
  listItems,
  listServices,
  type CatalogCategoryLite,
  type CatalogItemLite,
  type CatalogServiceLite,
} from '@/lib/api/catalog-service';
import { updateCatalogItemPrices } from '@/lib/api/admin-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';

function statusVariant(active: boolean): string {
  return active
    ? 'bg-success-soft text-success-ink'
    : 'bg-muted text-muted-foreground';
}

function formatStatus(active: boolean): string {
  return active ? 'Actif' : 'Inactif';
}

export default function AdminCataloguePage() {
  const [services, setServices] = useState<CatalogServiceLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [itemPrices, setItemPrices] = useState<Record<string, { price: string; travelFee: string; active: boolean; paymentType: string }>>({});
  const [categoriesByService, setCategoriesByService] = useState<Record<string, CatalogCategoryLite[]>>({});
  const [itemsByCategory, setItemsByCategory] = useState<Record<string, CatalogItemLite[]>>({});

  const loadServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listServices();
      setServices(data);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Impossible de charger le catalogue.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  const loadCategories = useCallback(async (serviceCode: string, serviceId: string) => {
    try {
      const cats = await listCategories(serviceCode);
      setCategoriesByService((prev) => ({ ...prev, [serviceId]: cats }));
    } catch (err) {
      setError(toUserErrorMessage(err, 'Impossible de charger les catégories.'));
    }
  }, []);

  const loadItems = useCallback(async (serviceCode: string, catId: string, categoryId: string) => {
    try {
      const its = await listItems(serviceCode, catId);
      setItemsByCategory((prev) => ({ ...prev, [categoryId]: its }));
    } catch (err) {
      setError(toUserErrorMessage(err, 'Impossible de charger les items.'));
    }
  }, []);

  if (error) {
    return (
      <div className="space-y-5">
        <PageHeader title="Catalogue" description="Gestion du catalogue de services v2." />
        <Alert variant="error">{error}</Alert>
        <Button variant="secondary" onClick={() => void loadServices()}>
          Réessayer
        </Button>
      </div>
    );
  }

  if (loading || services.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader title="Catalogue" description="Gestion du catalogue de services v2." />
        <div role="status" aria-label="Chargement du catalogue">
          <span className="sr-only">Chargement…</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Catalogue" description="Gestion des services, catégories et items v2." />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            isExpanded={expandedService === service.id}
            onToggle={() =>
              setExpandedService(expandedService === service.id ? null : service.id)
            }
            onSelectCategory={(catId) =>
              setExpandedCategory(expandedCategory === catId ? null : catId)
            }
            expandedCategory={expandedCategory}
            categories={categoriesByService[service.id] ?? []}
            itemsByCategory={itemsByCategory}
            editingItem={editingItem}
            itemPrices={itemPrices}
            setItemPrices={setItemPrices}
            loadCategories={() => void loadCategories(service.code, service.id)}
            loadItems={(catId, categoryId) => void loadItems(service.code, catId, categoryId)}
            onEditItem={(item) => {
              setEditingItem(item.id);
              setItemPrices((prev) => ({
                ...prev,
                [item.id]: {
                  price: String(item.price ?? ''),
                  travelFee: String(item.travelFee ?? ''),
                  active: item.active,
                  paymentType: item.paymentType ?? 'END_OF_SERVICE',
                },
              }));
            }}
            onSaveItem={async (itemId) => {
              const values = itemPrices[itemId];
              if (!values) return;
              try {
                await updateCatalogItemPrices(itemId, {
                  price: values.price === '' ? null : Number(values.price),
                  travelFee: values.travelFee === '' ? null : Number(values.travelFee),
                  active: values.active,
                  paymentType: values.paymentType,
                });
                setEditingItem(null);
                setItemPrices((prev) => {
                  const next = { ...prev };
                  delete next[itemId];
                  return next;
                });
                void loadServices();
              } catch (err) {
                setError(toUserErrorMessage(err, 'Impossible de mettre à jour l\'item.'));
              }
            }}
            onCancelItem={() => {
              setEditingItem(null);
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface ServiceCardProps {
  service: CatalogServiceLite;
  isExpanded: boolean;
  onToggle: () => void;
  onSelectCategory: (catId: string) => void;
  expandedCategory: string | null;
  categories: CatalogCategoryLite[];
  itemsByCategory: Record<string, CatalogItemLite[]>;
  editingItem: string | null;
  itemPrices: Record<string, { price: string; travelFee: string; active: boolean; paymentType: string }>;
  setItemPrices: React.Dispatch<React.SetStateAction<Record<string, { price: string; travelFee: string; active: boolean; paymentType: string }>>>;
  loadCategories: () => void;
  loadItems: (catId: string, categoryId: string) => void;
  onEditItem: (item: CatalogItemLite) => void;
  onSaveItem: (itemId: string) => void;
  onCancelItem: () => void;
}

function ServiceCard({
  service,
  isExpanded,
  onToggle,
  onSelectCategory,
  expandedCategory,
  categories,
  itemsByCategory,
  editingItem,
  itemPrices,
  setItemPrices,
  loadCategories,
  loadItems,
  onEditItem,
  onSaveItem,
  onCancelItem,
}: ServiceCardProps) {
  const categoriesLoaded = categories.length > 0;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between p-4">
        <CardTitle className="text-sm font-semibold">{service.label}</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          aria-label={isExpanded ? 'Réduire' : 'Développer'}
        >
          {isExpanded ? <Icon name="chevron-down" size="sm" /> : <Icon name="chevron-right" size="sm" />}
        </Button>
      </CardHeader>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-3">Code : {service.code}</p>
        {service.description && (
          <p className="text-xs text-muted-foreground mb-4">{service.description}</p>
        )}
        {isExpanded && (
          <div className="space-y-3">
            {!categoriesLoaded && (
              <Button variant="outline" size="sm" onClick={loadCategories}>
                Charger les catégories
              </Button>
            )}
            {categoriesLoaded && categories.length === 0 && (
              <EmptyState title="Aucune catégorie" description="Ce service n'a pas encore de catégories." />
            )}
            {categories.map((cat) => {
              const catItems = itemsByCategory[cat.id] ?? [];
              const itemsLoaded = catItems.length > 0 || cat.id in itemsByCategory;
              return (
                <CategorySection
                  key={cat.id}
                  category={cat}
                  isExpanded={expandedCategory === cat.id}
                  onToggle={() => onSelectCategory(cat.id)}
                  items={catItems}
                  itemsLoaded={itemsLoaded}
                  loadItems={() => void loadItems(cat.id, cat.id)}
                  editingItem={editingItem}
                  itemPrices={itemPrices}
                  setItemPrices={setItemPrices}
                  onEditItem={onEditItem}
                  onSaveItem={onSaveItem}
                  onCancelItem={onCancelItem}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CategorySectionProps {
  category: CatalogCategoryLite;
  isExpanded: boolean;
  onToggle: () => void;
  items: CatalogItemLite[];
  itemsLoaded: boolean;
  loadItems: () => void;
  editingItem: string | null;
  itemPrices: Record<string, { price: string; travelFee: string; active: boolean; paymentType: string }>;
  setItemPrices: React.Dispatch<React.SetStateAction<Record<string, { price: string; travelFee: string; active: boolean; paymentType: string }>>>;
  onEditItem: (item: CatalogItemLite) => void;
  onSaveItem: (itemId: string) => void;
  onCancelItem: () => void;
}

function CategorySection({
  category,
  isExpanded,
  onToggle,
  items,
  itemsLoaded,
  loadItems,
  editingItem,
  itemPrices,
  setItemPrices,
  onEditItem,
  onSaveItem,
  onCancelItem,
}: CategorySectionProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex flex-row items-center justify-between px-3 py-2 bg-muted cursor-pointer" onClick={onToggle}>
        <span className="text-sm font-medium">{category.label}</span>
        {isExpanded ? <Icon name="chevron-down" size="sm" /> : <Icon name="chevron-right" size="sm" />}
      </div>
      {isExpanded && (
        <div className="p-3">
          {!itemsLoaded && (
            <Button variant="outline" size="sm" onClick={loadItems} className="w-full">
              Charger les items
            </Button>
          )}
          {itemsLoaded && items.length === 0 && (
            <EmptyState title="Aucun item" description="Cette catégorie n'a pas encore d'items." className="p-2" />
          )}
          {itemsLoaded && items.length > 0 && (
            <div className="space-y-2">
              {items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  editingItem={editingItem}
                  itemPrices={itemPrices}
                  setItemPrices={setItemPrices}
                  onEditItem={onEditItem}
                  onSaveItem={onSaveItem}
                  onCancelItem={onCancelItem}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ItemRowProps {
  item: CatalogItemLite;
  editingItem: string | null;
  itemPrices: Record<string, { price: string; travelFee: string; active: boolean; paymentType: string }>;
  setItemPrices: React.Dispatch<React.SetStateAction<Record<string, { price: string; travelFee: string; active: boolean; paymentType: string }>>>;
  onEditItem: (item: CatalogItemLite) => void;
  onSaveItem: (itemId: string) => void;
  onCancelItem: () => void;
}

function ItemRow({
  item,
  editingItem,
  itemPrices,
  setItemPrices,
  onEditItem,
  onSaveItem,
  onCancelItem,
}: ItemRowProps) {
  const isEditing = editingItem === item.id;
  const values = itemPrices[item.id] ?? { price: String(item.price ?? ''), active: item.active };

  return (
    <div className={`border-b last:border-b-0 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <span className="text-sm font-medium">{item.label}</span>
        {item.androidVersion && (
          <span className="text-xs text-muted-foreground">{item.androidVersion}</span>
        )}
        {item.description && (
          <p className="text-xs text-muted-foreground">{item.description}</p>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={values.price}
              onChange={(e) => {
                setItemPrices((prev) => ({
                  ...prev,
                  [item.id]: { ...prev[item.id], price: e.target.value },
                }));
              }}
              className="w-24 h-10 text-sm"
              placeholder="Prix"
            />
            <Input
              value={values.travelFee}
              onChange={(e) => {
                setItemPrices((prev) => ({
                  ...prev,
                  [item.id]: { ...prev[item.id], travelFee: e.target.value },
                }));
              }}
              className="w-24 h-10 text-sm"
              placeholder="Frais dépl."
            />
            <select
              value={values.paymentType}
              onChange={(e) => {
                setItemPrices((prev) => ({
                  ...prev,
                  [item.id]: { ...prev[item.id], paymentType: e.target.value },
                }));
              }}
              className="h-10 text-sm border border-border rounded-lg px-2 bg-input"
            >
              <option value="END_OF_SERVICE">Paiement à la fin</option>
              <option value="DEPOSIT_50">Acompte 50%</option>
            </select>
            <label className="flex items-center gap-1 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={values.active}
                onChange={(e) => {
                  setItemPrices((prev) => ({
                    ...prev,
                    [item.id]: { ...prev[item.id], active: e.target.checked },
                  }));
                }}
                className="rounded border-gray-300"
              />
              Actif
            </label>
            <Button variant="outline" size="sm" onClick={() => void onSaveItem(item.id)}>
              Enregistrer
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancelItem}>
              Annuler
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${statusVariant(item.active)}`}>
              {formatStatus(item.active)}
            </span>
            <span className="text-xs text-muted-foreground">
              {item.price != null ? formatCurrency(item.price, 'XAF') : '—'}
            </span>
            {item.travelFee != null && item.travelFee > 0 && (
              <span className="text-xs text-muted-foreground">
                + {formatCurrency(item.travelFee, 'XAF')} déplacement
              </span>
            )}
            <span className={`text-xs font-medium ${item.paymentType === 'DEPOSIT_50' ? 'text-orange-700' : 'text-slate-500'}`}>
              {item.paymentType === 'DEPOSIT_50' ? 'Acompte 50%' : 'Paiement à la fin'}
            </span>
            <Button variant="ghost" size="icon" onClick={() => onEditItem(item)}>
              <span className="size-4">✎</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
