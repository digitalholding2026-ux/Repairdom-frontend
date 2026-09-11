'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Icon } from '@/components/ui/icon';
import { Alert } from '@/components/ui/alert';
import { Field, Input, Textarea, Switch } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import {
  getBrand,
  createModel,
  createProblem,
  updateBrand,
  updateModel,
  type CatalogBrandDetail,
} from '@/lib/api/admin-service';

export default function AdminBrandPage() {
  const params = useParams<{ domainId: string; brandId: string }>();
  const router = useRouter();
  const [brand, setBrand] = useState<CatalogBrandDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [showCreateProblem, setShowCreateProblem] = useState(false);
  const [creatingProblem, setCreatingProblem] = useState(false);
  const [newProblemName, setNewProblemName] = useState('');
  const [newProblemSlug, setNewProblemSlug] = useState('');
  const [newProblemDesc, setNewProblemDesc] = useState('');

  async function load(quiet = false) {
    if (!params?.brandId) return;
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const data = await getBrand(params.brandId);
      setBrand(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  useEffect(() => { load(); }, [params?.brandId]);

  const handleCreateModel = async () => {
    if (!params?.brandId) return;
    const name = newName.trim();
    const slug = newSlug.trim().toLowerCase() || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!name) return;
    setCreating(true);
    try {
      await createModel({
        brandId: params.brandId,
        name,
        slug,
        description: newDesc.trim() || undefined,
      });
      setShowCreate(false);
      setNewName('');
      setNewSlug('');
      setNewDesc('');
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création.');
    } finally {
      setCreating(false);
    }
  };

  // Sprint 8.7 — création ancrée à la marque courante (brandId), modelId = null.
  // Un problème créé ici n'est PAS un problème générique du domaine : il reste
  // rattaché à la marque et peut ensuite être décliné par modèle via la page
  // du modèle (ou rester valable pour toute la marque).
  const handleCreateProblem = async () => {
    if (!params?.brandId || !brand) return;
    const name = newProblemName.trim();
    const slug = newProblemSlug.trim().toLowerCase() || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!name) return;
    setCreatingProblem(true);
    try {
      const problem = await createProblem({
        domainId: brand.domain?.id ?? params.domainId,
        brandId: params.brandId,
        name,
        slug,
        description: newProblemDesc.trim() || undefined,
      });
      setShowCreateProblem(false);
      setNewProblemName('');
      setNewProblemSlug('');
      setNewProblemDesc('');
      router.push(`/admin/catalog/${brand.domain?.id ?? params.domainId}/${problem.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création.');
    } finally {
      setCreatingProblem(false);
    }
  };

  const handleToggleBrandActive = async (active: boolean) => {
    if (!params?.brandId) return;
    try {
      await updateBrand(params.brandId, { isActive: active });
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.');
    }
  };

  const handleToggleModelActive = async (modelId: string, active: boolean) => {
    try {
      await updateModel(modelId, { isActive: active });
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>;
  if (!brand) return <EmptyState title="Marque introuvable" description={error ?? ''} action={<Link href="/admin/catalog"><Button>Retour au catalogue</Button></Link>} />;

  const domainId = brand.domain?.id ?? params?.domainId;

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: 'Catalogue', href: '/admin/catalog' },
          { label: brand.domain?.name ?? 'Domaine', href: `/admin/catalog/${domainId}` },
          { label: brand.name },
        ]}
      />
      <PageHeader
        title={brand.name}
        description="Modèles et problèmes de cette marque."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowCreateProblem(true)}>
              <Icon name="plus" size="3.5" />
              Nouveau problème
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="space-y-3 pt-4">
          <Badge variant="outline">{brand.domain?.name}</Badge>
          {brand.description ? <p className="text-sm text-muted-foreground">{brand.description}</p> : null}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Actif</span>
            <Switch checked={brand.isActive} onCheckedChange={handleToggleBrandActive} />
          </div>
          <p className="text-xs text-muted-foreground">Slug : {brand.slug}</p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Modèles ({brand.models.length})</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Icon name="plus" size="3.5" />
          Modèle
        </Button>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {brand.models.length === 0 ? (
        <EmptyState icon="briefcase" title="Aucun modèle" description="Ajoutez un modèle pour cette marque." />
      ) : (
        <div className="space-y-2">
          {brand.models.map((model) => (
            <Card key={model.id}>
              <CardContent className="flex items-center justify-between gap-3 pt-4">
                <Link
                  href={`/admin/catalog/${domainId}/brands/${brand.id}/models/${model.id}`}
                  className="min-w-0 flex-1"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{model.name}</p>
                      <Badge variant={model.isActive ? 'success' : 'neutral'}>
                        {model.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    {model.description ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{model.description}</p>
                    ) : null}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {model._count?.problems ?? 0}{' '}
                      problème{model._count?.problems !== 1 ? 's' : ''}
                    </p>
                  </div>
                </Link>
                <Switch
                  checked={model.isActive}
                  onCheckedChange={(active) => handleToggleModelActive(model.id, active)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showCreateProblem}
        onClose={() => setShowCreateProblem(false)}
        title="Nouveau problème"
        description={`Rattaché à la marque ${brand.name} (et non au domaine). Vous pourrez le décliner par modèle depuis sa page modèle.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreateProblem(false)} disabled={creatingProblem}>Annuler</Button>
            <Button onClick={handleCreateProblem} isLoading={creatingProblem} disabled={!newProblemName.trim()}>Créer</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Nom" htmlFor="brandProblemName" required>
            <Input id="brandProblemName" value={newProblemName} onChange={(e) => setNewProblemName(e.target.value)} placeholder="Ex. : Vibrations anormales" />
          </Field>
          <Field label="Slug" htmlFor="brandProblemSlug" hint="Généré automatiquement si vide">
            <Input id="brandProblemSlug" value={newProblemSlug} onChange={(e) => setNewProblemSlug(e.target.value)} />
          </Field>
          <Field label="Description" htmlFor="brandProblemDesc">
            <Textarea id="brandProblemDesc" value={newProblemDesc} onChange={(e) => setNewProblemDesc(e.target.value)} rows={2} maxLength={1000} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nouveau modèle"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)} disabled={creating}>Annuler</Button>
            <Button onClick={handleCreateModel} isLoading={creating} disabled={!newName.trim()}>Créer</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Nom" htmlFor="modelName" required>
            <Input id="modelName" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex. : Spark 10" />
          </Field>
          <Field label="Slug" htmlFor="modelSlug" hint="Généré automatiquement si vide">
            <Input id="modelSlug" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="spark-10" />
          </Field>
          <Field label="Description" htmlFor="modelDesc">
            <Textarea id="modelDesc" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} maxLength={1000} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}