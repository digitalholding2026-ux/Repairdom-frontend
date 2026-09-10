'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Icon } from '@/components/ui/icon';
import { Alert } from '@/components/ui/alert';
import { Field, Input, Textarea, Switch } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import {
  getDomain,
  createProblem,
  createBrand,
  updateDomain,
  type CatalogDomainDetail,
  type CatalogProblem,
} from '@/lib/api/admin-service';

export default function AdminDomainPage() {
  const params = useParams<{ domainId: string }>();
  const [domain, setDomain] = useState<CatalogDomainDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [showCreateBrand, setShowCreateBrand] = useState(false);
  const [creatingBrand, setCreatingBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandSlug, setNewBrandSlug] = useState('');
  const [newBrandDesc, setNewBrandDesc] = useState('');

  async function load(quiet = false) {
    if (!params?.domainId) return;
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const data = await getDomain(params.domainId);
      setDomain(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  useEffect(() => { load(); }, [params?.domainId]);

  const handleCreateProblem = async () => {
    if (!params?.domainId) return;
    const name = newName.trim();
    const slug = newSlug.trim().toLowerCase() || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!name) return;
    setCreating(true);
    try {
      await createProblem({ domainId: params.domainId, name, slug, description: newDesc.trim() || undefined });
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

  const handleToggleActive = async (active: boolean) => {
    if (!params?.domainId) return;
    try {
      await updateDomain(params.domainId, { isActive: active });
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.');
    }
  };

  const handleCreateBrand = async () => {
    if (!params?.domainId) return;
    const name = newBrandName.trim();
    const slug = newBrandSlug.trim().toLowerCase() || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!name) return;
    setCreatingBrand(true);
    try {
      await createBrand({ domainId: params.domainId, name, slug, description: newBrandDesc.trim() || undefined });
      setShowCreateBrand(false);
      setNewBrandName('');
      setNewBrandSlug('');
      setNewBrandDesc('');
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de la marque.');
    } finally {
      setCreatingBrand(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>;
  if (!domain) return <EmptyState title="Domaine introuvable" description={error ?? ''} action={<Link href="/admin/catalog"><Button>Retour au catalogue</Button></Link>} />;

  return (
    <div className="space-y-4">
      <PageHeader title={domain.name} backHref="/admin/catalog" />

      <Card>
        <CardContent className="space-y-3 pt-4">
          {domain.description ? <p className="text-sm text-muted-foreground">{domain.description}</p> : null}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Actif</span>
            <Switch checked={domain.isActive} onCheckedChange={handleToggleActive} />
          </div>
          <p className="text-xs text-muted-foreground">
            Slug : {domain.slug}
            {domain.category ? ` — Catégorie : ${domain.category}` : ''}
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Marques ({domain.brands.length})</h2>
        <Button size="sm" onClick={() => setShowCreateBrand(true)}>
          <Icon name="plus" size="3.5" />
          Marque
        </Button>
      </div>

      {domain.brands.length === 0 ? (
        <EmptyState icon="briefcase" title="Aucune marque" description="Ajoutez une marque pour ce domaine." />
      ) : (
        <div className="space-y-2">
          {domain.brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/admin/catalog/${domain.id}/brands/${brand.id}`}
              className="block"
            >
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between gap-3 pt-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{brand.name}</p>
                      <Badge variant={brand.isActive ? 'success' : 'neutral'}>
                        {brand.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    {brand.description ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {brand.description}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {brand._count?.models ?? 0} modèle{(brand._count?.models ?? 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Icon name="chevron-right" size="sm" className="shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Problèmes ({domain.problems.length})</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Icon name="plus" size="3.5" />
          Problème
        </Button>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {domain.problems.length === 0 ? (
        <EmptyState icon="file" title="Aucun problème" description="Ajoutez un problème pour ce domaine." />
      ) : (
        <div className="space-y-2">
          {domain.problems.map((problem) => (
            <Link key={problem.id} href={`/admin/catalog/${domain.id}/${problem.id}`} className="block">
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between gap-3 pt-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{problem.name}</p>
                      <Badge variant={problem.isActive ? 'success' : 'neutral'}>
                        {problem.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    {problem.description ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{problem.description}</p>
                    ) : null}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {problem._count?.diagnostics ?? 0} diagnostic{(problem._count?.diagnostics ?? 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Icon name="chevron-right" size="sm" className="shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal
        open={showCreateBrand}
        onClose={() => setShowCreateBrand(false)}
        title="Nouvelle marque"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreateBrand(false)} disabled={creatingBrand}>
              Annuler
            </Button>
            <Button onClick={handleCreateBrand} isLoading={creatingBrand} disabled={!newBrandName.trim()}>
              Créer
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Nom" htmlFor="brandName" required>
            <Input
              id="brandName"
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              placeholder="Ex. : Tecno"
            />
          </Field>
          <Field label="Slug" htmlFor="brandSlug" hint="Généré automatiquement si vide">
            <Input
              id="brandSlug"
              value={newBrandSlug}
              onChange={(e) => setNewBrandSlug(e.target.value)}
              placeholder="tecno"
            />
          </Field>
          <Field label="Description" htmlFor="brandDesc">
            <Textarea
              id="brandDesc"
              value={newBrandDesc}
              onChange={(e) => setNewBrandDesc(e.target.value)}
              rows={2}
              maxLength={1000}
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nouveau problème"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)} disabled={creating}>Annuler</Button>
            <Button onClick={handleCreateProblem} isLoading={creating} disabled={!newName.trim()}>Créer</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Nom" htmlFor="problemName" required>
            <Input id="problemName" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex. : Écran cassé" />
          </Field>
          <Field label="Slug" htmlFor="problemSlug" hint="Généré automatiquement si vide">
            <Input id="problemSlug" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="ecran-casse" />
          </Field>
          <Field label="Description" htmlFor="problemDesc">
            <Textarea id="problemDesc" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} maxLength={1000} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
