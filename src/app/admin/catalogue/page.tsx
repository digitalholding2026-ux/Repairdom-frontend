'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import {
  listCategories,
  listItems,
  listServices,
  type CatalogCategoryLite,
  type CatalogItemLite,
  type CatalogServiceLite,
} from '@/lib/api/catalog-service';
import { createCatalogItem, deleteCatalogItem, updateCatalogItem, updateCatalogItemPrices } from '@/lib/api/admin-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';

function targetDeviceBadgeClass(targetDevice: string): string {
  switch (targetDevice) {
    case 'ALL':
      return 'bg-slate-100 text-slate-700 border border-slate-200';
    case 'PC':
      return 'bg-blue-100 text-blue-700 border border-blue-200';
    case 'MAC':
      return 'bg-indigo-100 text-indigo-700 border border-indigo-200';
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200';
  }
}

function targetDeviceLabel(targetDevice: string): string {
  if (targetDevice === 'ALL') return 'Tous';
  if (targetDevice === 'PC') return 'PC';
  return 'Mac';
}

function activeButtonClass(active: boolean): string {
  return active
    ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200'
    : 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-200';
}

function activeIconClass(active: boolean): string {
  return active ? 'text-green-600 hover:bg-green-50' : 'text-red-600 hover:bg-red-50';
}

export default function AdminCataloguePage() {
  const [services, setServices] = useState<CatalogServiceLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [categoriesByService, setCategoriesByService] = useState<Record<string, CatalogCategoryLite[]>>({});
  const [itemsByCategory, setItemsByCategory] = useState<Record<string, CatalogItemLite[]>>({});
  /* Modale */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalItemId, setModalItemId] = useState<string | null>(null);
  const [modalForm, setModalForm] = useState<{
    label: string; description: string; targetDevice: string;
    pricePublic: string; pricePro: string; paymentType: string; active: boolean;
  }>({
    label: '', description: '', targetDevice: 'ALL', pricePublic: '', pricePro: '', paymentType: 'END_OF_SERVICE', active: true,
  });

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

  const openCreateModal = () => {
    setModalMode('create');
    setModalItemId(null);
    setModalForm({ label: '', description: '', targetDevice: 'ALL', pricePublic: '', pricePro: '', paymentType: 'END_OF_SERVICE', active: true });
    setModalOpen(true);
  };

  const openEditModal = (item: CatalogItemLite) => {
    setModalMode('edit');
    setModalItemId(item.id);
    setModalForm({
      label: item.label,
      description: item.description ?? '',
      targetDevice: item.targetDevice ?? 'ALL',
      pricePublic: String(item.price ?? ''),
      pricePro: '',
      paymentType: item.paymentType ?? 'END_OF_SERVICE',
      active: item.active,
    });
    setModalOpen(true);
  };

  const handleModalSave = async () => {
    try {
      if (modalMode === 'create' && modalItemId === null) {
        if (!expandedCategory) {
          setError('Veuillez sélectionner une catégorie avant d’ajouter un item.');
          return;
        }
        await createCatalogItem({
          categoryId: expandedCategory,
          code: modalForm.label.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'ITEM',
          label: modalForm.label,
          description: modalForm.description || null,
          androidVersion: null,
          pricePublic: modalForm.pricePublic === '' ? null : Number(modalForm.pricePublic),
          pricePro: modalForm.pricePro === '' ? null : Number(modalForm.pricePro),
          active: modalForm.active,
          paymentType: modalForm.paymentType,
          targetDevice: modalForm.targetDevice,
        });
      } else if (modalItemId) {
        /* Champs texte / état : route PATCH items/:id */
        await updateCatalogItem(modalItemId, {
          label: modalForm.label,
          description: modalForm.description || null,
          targetDevice: modalForm.targetDevice,
          paymentType: modalForm.paymentType,
          active: modalForm.active,
        });
        /* Prix : route PATCH items/:id/prices (seulement si un prix est saisi) */
        if (modalForm.pricePublic !== '') {
          await updateCatalogItemPrices(modalItemId, {
            pricePublic: Number(modalForm.pricePublic),
            travelFee: null,
          });
        }
      }
      setModalOpen(false);
      void loadServices();
    } catch (err) {
      setError(toUserErrorMessage(err, 'Impossible d\'enregistrer l\'item.'));
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!window.confirm('Supprimer cet item ?')) return;
    try {
      await deleteCatalogItem(itemId);
      void loadServices();
    } catch (err) {
      setError(toUserErrorMessage(err, 'Impossible de supprimer l\'item.'));
    }
  };

  const handleToggleActive = async (itemId: string, active: boolean) => {
    try {
      await updateCatalogItemPrices(itemId, { active });
      void loadServices();
    } catch (err) {
      setError(toUserErrorMessage(err, 'Impossible de modifier l\'état de l\'item.'));
    }
  };

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader title="Catalogue" description="Gestion des services, catégories et items v2." />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => void loadServices()} aria-label="Actualiser">
            <span className="size-4">↻</span>
          </Button>
          <Button onClick={openCreateModal}>
            + Ajouter un item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {services.map((service) => {
          const categories = categoriesByService[service.id] ?? [];
          const categoriesLoaded = categories.length > 0;

          return (
            <Card key={service.id} className="flex flex-col h-full border border-border">
              <CardHeader className="flex flex-row items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-semibold">{service.label}</CardTitle>
                  <span className="text-xs text-muted-foreground">Code : {service.code}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setExpandedService(expandedService === service.id ? null : service.id)}
                  aria-label={expandedService === service.id ? 'Réduire' : 'Développer'}
                >
                  {expandedService === service.id ? <span className="size-4">▾</span> : <span className="size-4">▸</span>}
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                {service.description && (
                  <p className="text-xs text-muted-foreground mb-4">{service.description}</p>
                )}
                {expandedService === service.id && (
                  <div className="space-y-3">
                    {!categoriesLoaded && (
                      <Button variant="outline" size="sm" onClick={() => void loadCategories(service.code, service.id)}>
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
                        <Card key={cat.id} className="border border-border rounded-xl overflow-hidden">
                          <CardHeader className="flex flex-row items-center justify-between px-4 py-2 bg-muted/50 cursor-pointer" onClick={() => {
                            const isOpening = expandedCategory !== cat.id;
                            setExpandedCategory(isOpening ? cat.id : null);
                            if (isOpening && !itemsLoaded) {
                              void loadItems(service.code, cat.id, cat.id);
                            }
                          }}>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{cat.label}</span>
                              {itemsLoaded && catItems.length > 0 && (
                                <span className="text-xs text-muted-foreground">({catItems.length})</span>
                              )}
                            </div>
                            {expandedCategory === cat.id ? <span className="size-4">▾</span> : <span className="size-4">▸</span>}
                          </CardHeader>
                          {expandedCategory === cat.id && (
                            <CardContent className="p-0">
                              {itemsLoaded && catItems.length === 0 && (
                                <div className="p-4 text-center text-xs text-muted-foreground">
                                  Aucun item dans cette catégorie.
                                </div>
                              )}
                              {itemsLoaded && catItems.length > 0 && (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm border-collapse">
                                    <thead>
                                      <tr className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
                                        <th className="text-left px-4 py-3 border-b border-border font-medium">Nom</th>
                                        <th className="text-center px-4 py-3 border-b border-border font-medium">Cible</th>
                                        <th className="text-right px-4 py-3 border-b border-border font-medium">Prix</th>
                                        <th className="text-center px-4 py-3 border-b border-border font-medium">Statut</th>
                                        <th className="text-right px-4 py-3 border-b border-border font-medium">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                      {catItems.map((item) => (
                                        <tr key={item.id} className="hover:bg-muted/50 transition-colors group">
                                          <td className="px-4 py-3 border-b border-border">
                                            <div className="text-sm font-medium">{item.label}</div>
                                            {item.description && (
                                              <p className="text-xs text-muted-foreground truncate max-w-xs">{item.description}</p>
                                            )}
                                            {item.androidVersion && (
                                              <span className="text-xs text-muted-foreground">{item.androidVersion}</span>
                                            )}
                                          </td>
                                          <td className="px-4 py-3 border-b border-border text-center">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${targetDeviceBadgeClass(item.targetDevice)}`}>
                                              {targetDeviceLabel(item.targetDevice)}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 border-b border-border text-right tabular-nums">
                                            <span className="text-sm font-medium">
                                              {item.price != null ? formatCurrency(item.price, 'XAF') : '—'}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 border-b border-border text-center">
                                            <button
                                              type="button"
                                              onClick={() => void handleToggleActive(item.id, !item.active)}
                                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-colors ${activeButtonClass(item.active)}`}
                                            >
                                              {item.active ? 'Actif' : 'Inactif'}
                                            </button>
                                          </td>
                                          <td className="px-4 py-3 border-b border-border text-right">
                                            <div className="flex items-center justify-end gap-1">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openEditModal(item)}
                                                aria-label="Modifier"
                                              >
                                                <span className="size-4">✎</span>
                                              </Button>
                                              <button
                                                type="button"
                                                onClick={() => void handleToggleActive(item.id, !item.active)}
                                                className={`rounded p-1.5 text-xs transition-colors ${activeIconClass(item.active)}`}
                                              >
                                                {item.active ? '👁️‍🗨️' : '👁️'}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => void handleDelete(item.id)}
                                                className="rounded p-1.5 text-red-600 hover:bg-red-50 transition-colors"
                                                aria-label="Supprimer"
                                              >
                                                <span className="size-4">🗑️</span>
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modale d'édition / création */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={modalMode === 'create' ? 'Nouvel item' : 'Modifier l\'item'} description={modalMode === 'create' ? 'Créez un nouvel item de catalogue dans la catégorie sélectionnée.' : 'Modifiez les informations de l\'item sélectionné.'} centered>
        <div className="space-y-4 py-3">
          <Field label="Nom de l'item">
            <Input
              value={modalForm.label}
              onChange={(e) => setModalForm((prev) => ({ ...prev, label: e.target.value }))}
              placeholder="ex: Windows 11"
            />
          </Field>
          <Field label="Description">
            <Input
              value={modalForm.description}
              onChange={(e) => setModalForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Description courte"
            />
          </Field>
          <Field label="Cible">
            <select
              value={modalForm.targetDevice}
              onChange={(e) => setModalForm((prev) => ({ ...prev, targetDevice: e.target.value }))}
              className="w-full h-10 rounded-lg border border-border bg-input px-3 text-sm"
            >
              <option value="ALL">Tous les appareils</option>
              <option value="PC">PC uniquement</option>
              <option value="MAC">Mac uniquement</option>
            </select>
          </Field>
          <Field label="Prix public (XAF)">
            <Input
              type="number"
              value={modalForm.pricePublic}
              onChange={(e) => setModalForm((prev) => ({ ...prev, pricePublic: e.target.value }))}
              placeholder="0"
            />
          </Field>
          <Field label="Prix professionnel (XAF)">
            <Input
              type="number"
              value={modalForm.pricePro}
              onChange={(e) => setModalForm((prev) => ({ ...prev, pricePro: e.target.value }))}
              placeholder="0"
            />
          </Field>
          <Field label="Type de paiement">
            <select
              value={modalForm.paymentType}
              onChange={(e) => setModalForm((prev) => ({ ...prev, paymentType: e.target.value }))}
              className="w-full h-10 rounded-lg border border-border bg-input px-3 text-sm"
            >
              <option value="END_OF_SERVICE">Paiement à la fin</option>
              <option value="DEPOSIT_50">Acompte 50%</option>
            </select>
          </Field>
          <Field label="Actif">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={modalForm.active}
                onChange={(e) => setModalForm((prev) => ({ ...prev, active: e.target.checked }))}
                className="rounded border-gray-300 text-primary"
              />
              {modalForm.active ? 'Actif' : 'Inactif'}
            </label>
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => setModalOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleModalSave}>
            Enregistrer les modifications
          </Button>
        </div>
      </Modal>
    </div>
  );
}
