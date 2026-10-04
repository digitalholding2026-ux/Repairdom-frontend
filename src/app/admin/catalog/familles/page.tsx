'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Icon } from '@/components/ui/icon';
import { Alert } from '@/components/ui/alert';
import { Field, Input, Select, Switch } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { DeleteCatalogItem } from '@/components/admin/catalog/delete-catalog-item';
import { REQUEST_CATEGORIES } from '@/lib/data/request-categories';
import {
  listFamilies,
  createFamily,
  updateFamily,
  deleteFamily,
  type CatalogFamily,
  type CatalogDeleteOutcome,
} from '@/lib/api/admin-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';
import { extractErrorMessage } from '@/lib/errors';

function categoryLabel(id: string): string {
  return REQUEST_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export default function AdminFamiliesPage() {
  const [families, setFamilies] = useState<CatalogFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState('');
  const [category, setCategory] = useState('electromenager');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setFamilies(await listFamilies());
    } catch (err) {
      setError(toUserErrorMessage(err, 'Erreur de chargement.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    setError(null);
    setCreating(true);
    try {
      await createFamily({
        code: code.trim(),
        label: label.trim(),
        icon: icon.trim() || undefined,
        category,
      });
      setShowCreate(false);
      setCode('');
      setLabel('');
      setIcon('');
      setCategory('electromenager');
      setNotice('Famille créée.');
      await load();
    } catch (err) {
      setError(extractErrorMessage(err, 'Erreur lors de la création.'));
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (family: CatalogFamily) => {
    try {
      await updateFamily(family.id, { isActive: !family.isActive });
      await load();
    } catch (err) {
      setError(toUserErrorMessage(err, 'Erreur.'));
    }
  };

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Catalogue', href: '/admin/catalog' }, { label: "Familles d'équipements" }]} />
      <PageHeader
        title="Familles d'équipements"
        description="Indices structurés du parcours « Autre appareil ». Chaque famille est rattachée à une catégorie de dispatch — une demande reçoit cette catégorie, les techniciens sont matchés dessus."
        actions={
          <Button variant="ghost" size="sm" onClick={() => setShowCreate(true)}>
            <Icon name="plus" size="3.5" />
            Famille
          </Button>
        }
      />

      {notice ? <Alert variant="success">{notice}</Alert> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : families.length === 0 ? (
        <EmptyState
          icon={<Icon name="wrench" size="md" />}
          title="Aucune famille"
          description="Aucune famille n'est configurée. Ajoutez au moins une famille pour activer le parcours « Autre appareil »."
        />
      ) : (
        <section className="space-y-2">
          <SectionHeader title={`Familles (${families.length})`} icon="wrench" />
          <div className="grid gap-2 lg:grid-cols-2">
            {families.map((family) => (
              <Card key={family.id}>
                <CardContent className="flex items-center justify-between gap-3 pt-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {family.icon ? <span aria-hidden>{family.icon}</span> : null}
                      <p className="truncate text-sm font-semibold">{family.label}</p>
                      <Badge variant={family.isActive ? 'success' : 'neutral'}>
                        {family.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Code : {family.code} · Dispatch : {categoryLabel(family.category)}
                      {typeof family.demandeCount === 'number'
                        ? ` · ${family.demandeCount} demande${family.demandeCount !== 1 ? 's' : ''}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={family.isActive} onCheckedChange={() => handleToggle(family)} />
                    <DeleteCatalogItem
                      itemLabel={family.label}
                      onDelete={() => deleteFamily(family.id)}
                      onDone={(outcome: CatalogDeleteOutcome | null, err: string | null) => {
                        if (err) setError(err);
                        else if (outcome) setNotice(outcome.message);
                        void load();
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouvelle famille">
        <div className="space-y-4">
          <Field label="Libellé" htmlFor="family-label" required>
            <Input
              id="family-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex. : Console / jeu vidéo"
              maxLength={100}
            />
          </Field>
          <Field label="Code" htmlFor="family-code" hint="Normalisé en majuscules automatiquement." required>
            <Input
              id="family-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ex. : GAME_CONSOLE"
              maxLength={40}
            />
          </Field>
          <Field label="Icône (emoji, optionnel)" htmlFor="family-icon">
            <Input
              id="family-icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="Ex. : 🎮"
              maxLength={20}
            />
          </Field>
          <Field label="Catégorie de dispatch" htmlFor="family-category" hint="La demande sera matchée sur les techniciens de cette catégorie.">
            <Select
              id="family-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {REQUEST_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreate}
              isLoading={creating}
              disabled={!label.trim() || !code.trim()}
            >
              Créer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
