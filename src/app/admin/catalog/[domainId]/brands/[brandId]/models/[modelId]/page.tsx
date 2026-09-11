'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
import { Field, Input, Textarea } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import {
  getModel,
  listProblems,
  createProblem,
  type CatalogModelDetail,
  type CatalogProblem,
} from '@/lib/api/admin-service';

function ProblemScopeBadge({ problem }: { problem: CatalogProblem }) {
  if (problem.model) {
    return <Badge variant="info">Modèle : {problem.model.name}</Badge>;
  }
  if (problem.brand) {
    return <Badge variant="info">Marque : {problem.brand.name}</Badge>;
  }
  return <Badge variant="neutral">Générique</Badge>;
}

export default function AdminModelPage() {
  const params = useParams<{ domainId: string; brandId: string; modelId: string }>();
  const [model, setModel] = useState<CatalogModelDetail | null>(null);
  const [problems, setProblems] = useState<CatalogProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const load = useCallback(async () => {
    if (!params?.modelId) return;
    setError(null);
    try {
      const data = await getModel(params.modelId);
      setModel(data);
      if (data.brand.domain) {
        const scoped = await listProblems(data.brand.domain.id, {
          brandId: data.brandId,
          modelId: data.id,
        });
        setProblems(scoped);
      } else {
        setProblems([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [params?.modelId]);

  useEffect(() => { load(); }, [load]);

  const handleCreateProblem = async () => {
    if (!params?.domainId) return;
    const name = newName.trim();
    const slug = newSlug.trim().toLowerCase() || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!name) return;
    setCreating(true);
    try {
      await createProblem({
        domainId: params.domainId,
        brandId: params.brandId,
        modelId: params.modelId,
        name,
        slug,
        description: newDesc.trim() || undefined,
      });
      setShowCreate(false);
      setNewName('');
      setNewSlug('');
      setNewDesc('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>;
  if (!model) return <EmptyState title="Modèle introuvable" description={error ?? ''} action={<Link href="/admin/catalog"><Button>Retour au catalogue</Button></Link>} />;

  const domainId = model.brand.domain?.id ?? params?.domainId;
  const brandId = params?.brandId ?? model.brandId;

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: 'Catalogue', href: '/admin/catalog' },
          { label: model.brand.domain?.name ?? 'Domaine', href: `/admin/catalog/${domainId}` },
          { label: model.brand.name, href: `/admin/catalog/${domainId}/brands/${brandId}` },
          { label: model.name },
        ]}
      />
      <PageHeader title={model.name} description={`Modèle : ${model.brand.name}`} />

      <Card>
        <CardContent className="space-y-3 pt-4">
          <Badge variant="outline">{model.brand.name}</Badge>
          {model.description ? <p className="text-sm text-muted-foreground">{model.description}</p> : null}
          <p className="text-xs text-muted-foreground">Slug : {model.slug}</p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Problèmes de ce modèle ({problems.length})</h2>
          <p className="text-xs text-muted-foreground">
            Problèmes génériques, de la marque et spécifiques à ce modèle.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Icon name="plus" size="3.5" />
          Problème
        </Button>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {problems.length === 0 ? (
        <EmptyState icon="file" title="Aucun problème" description="Ajoutez un problème pour ce modèle." />
      ) : (
        <div className="space-y-2">
          {problems.map((problem) => (
            <Link key={problem.id} href={`/admin/catalog/${domainId}/${problem.id}`} className="block">
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between gap-3 pt-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">{problem.name}</p>
                      <ProblemScopeBadge problem={problem} />
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
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nouveau problème"
        description={`Problème spécifique au modèle ${model.name} (${model.brand.name}).`}
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