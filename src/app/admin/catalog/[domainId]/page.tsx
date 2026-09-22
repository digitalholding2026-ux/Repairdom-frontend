'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Icon } from '@/components/ui/icon';
import { Alert } from '@/components/ui/alert';
import { Field, Input, Textarea, Switch } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { CatalogSkeleton } from '@/components/admin/catalog/catalog-skeleton';
import { DeleteCatalogItem } from '@/components/admin/catalog/delete-catalog-item';
import { autoSlug } from '@/lib/slug';
import { extractErrorMessage } from '@/lib/errors';
import {
  getDomain,
  createProblem,
  createBrand,
  updateDomain,
  deleteDomain,
  deleteBrand,
  deleteProblem,
  type CatalogDomainDetail,
  type CatalogDeleteOutcome,
} from '@/lib/api/admin-service';

export default function AdminDomainPage() {
  const params = useParams<{ domainId: string }>();
  const router = useRouter();
  const [domain, setDomain] = useState<CatalogDomainDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
    const slug = newSlug.trim().toLowerCase() || autoSlug(name);
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
      setError(extractErrorMessage(err, 'Erreur lors de la création.'));
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
    const slug = newBrandSlug.trim().toLowerCase() || autoSlug(name);
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
      setError(extractErrorMessage(err, 'Erreur lors de la création de la marque.'));
    } finally {
      setCreatingBrand(false);
    }
  };

  if (loading) return <CatalogSkeleton />;
  if (!domain) return <EmptyState title="Domaine introuvable" description={error ?? ''} action={<Link href="/admin/catalog"><Button>Retour au catalogue</Button></Link>} />;

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[{ label: 'Catalogue', href: '/admin/catalog' }, { label: domain.name }]}
      />
      <PageHeader title={domain.name} description="Marques et problèmes du domaine." />
      {notice ? <Alert variant="success">{notice}</Alert> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}

      <section className="space-y-3">
        <SectionHeader title="Informations" icon="info" />
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
      </section>

      <section className="space-y-3">
        <SectionHeader
          title={`Marques (${domain.brands.length})`}
          icon="briefcase"
          action={
            <Button size="sm" onClick={() => setShowCreateBrand(true)}>
              <Icon name="plus" size="3.5" />
              Marque
            </Button>
          }
        />
        {domain.brands.length === 0 ? (
          <EmptyState icon={<Icon name="briefcase" size="md" />} title="Aucune marque" description="Ajoutez une marque pour ce domaine." />
        ) : (
          <div className="space-y-2">
            {domain.brands.map((brand) => (
              <Card key={brand.id} className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between gap-3 pt-4">
                  <Link
                    href={`/admin/catalog/${domain.id}/brands/${brand.id}`}
                    className="min-w-0 flex-1"
                  >
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
                  </Link>
                  <div className="flex shrink-0 items-center gap-1">
                    <DeleteCatalogItem
                      itemLabel={brand.name}
                      onDelete={() => deleteBrand(brand.id)}
                      onDone={(outcome: CatalogDeleteOutcome | null, err: string | null) => {
                        if (err) setError(err);
                        else if (outcome) setNotice(outcome.message);
                        void load(true);
                      }}
                    />
                    <Icon name="chevron-right" size="sm" className="shrink-0 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <SectionHeader
          title={`Problèmes génériques (${domain.problems.length})`}
          icon="file"
          description="Problèmes valables pour tout appareil du domaine. Les problèmes spécifiques marque/modèle se gèrent depuis chaque marque."
          action={
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Icon name="plus" size="3.5" />
              Problème
            </Button>
          }
        />
        {error ? <Alert variant="error">{error}</Alert> : null}
        {domain.problems.length === 0 ? (
          <EmptyState icon={<Icon name="file" size="md" />} title="Aucun problème générique" description="Ajoutez un problème pour ce domaine." />
        ) : (
        <div className="space-y-2">
          {domain.problems.map((problem) => (
            <Card key={problem.id} className="transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center justify-between gap-3 pt-4">
                <Link href={`/admin/catalog/${domain.id}/${problem.id}`} className="min-w-0 flex-1">
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
                </Link>
                <div className="flex shrink-0 items-center gap-1">
                  <DeleteCatalogItem
                    itemLabel={problem.name}
                    onDelete={() => deleteProblem(problem.id)}
                    onDone={(outcome: CatalogDeleteOutcome | null, err: string | null) => {
                      if (err) setError(err);
                      else if (outcome) setNotice(outcome.message);
                      void load(true);
                    }}
                  />
                  <Icon name="chevron-right" size="sm" className="shrink-0 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </section>

      <section className="space-y-3">
        <SectionHeader title="Zone dangereuse" icon="alert" />
        <Card>
          <CardContent className="flex items-center justify-between gap-3 pt-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Supprimer ce domaine</p>
              <p className="text-xs text-muted-foreground">
                Suppression physique sans dépendance, désactivation sinon (historique conservé).
              </p>
            </div>
            <DeleteCatalogItem
              itemLabel={domain.name}
              onDelete={() => deleteDomain(domain.id)}
              onDone={(outcome: CatalogDeleteOutcome | null, err: string | null) => {
                if (err) setError(err);
                else if (outcome?.action === 'DELETED') router.push('/admin/catalog');
                else if (outcome) {
                  setNotice(outcome.message);
                  void load(true);
                }
              }}
            />
          </CardContent>
        </Card>
      </section>

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
