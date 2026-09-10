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
  getProblem,
  createDiagnostic,
  updateProblem,
  type CatalogProblemDetail,
} from '@/lib/api/admin-service';

export default function AdminProblemPage() {
  const params = useParams<{ domainId: string; problemId: string }>();
  const [problem, setProblem] = useState<CatalogProblemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDifficulty, setNewDifficulty] = useState('');
  const [newEstTime, setNewEstTime] = useState('');

  async function load(quiet = false) {
    if (!params?.problemId) return;
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const data = await getProblem(params.problemId);
      setProblem(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  useEffect(() => { load(); }, [params?.problemId]);

  const handleCreateDiagnostic = async () => {
    if (!params?.problemId) return;
    const name = newName.trim();
    const slug = newSlug.trim().toLowerCase() || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!name) return;
    setCreating(true);
    try {
      await createDiagnostic({
        problemId: params.problemId,
        name,
        slug,
        description: newDesc.trim() || undefined,
        difficulty: newDifficulty.trim() || undefined,
        estimatedTime: newEstTime.trim() || undefined,
      });
      setShowCreate(false);
      setNewName('');
      setNewSlug('');
      setNewDesc('');
      setNewDifficulty('');
      setNewEstTime('');
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (active: boolean) => {
    if (!params?.problemId) return;
    try {
      await updateProblem(params.problemId, { isActive: active });
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>;
  if (!problem) return <EmptyState title="Problème introuvable" description={error ?? ''} action={<Link href="/admin/catalog"><Button>Retour au catalogue</Button></Link>} />;

  const domainId = problem.domain?.id ?? params?.domainId;

  return (
    <div className="space-y-4">
      <PageHeader title={problem.name} backHref={`/admin/catalog/${domainId}`} />

      <Card>
        <CardContent className="space-y-3 pt-4">
          <Badge variant="outline">{problem.domain?.name}</Badge>
          {problem.description ? <p className="text-sm text-muted-foreground">{problem.description}</p> : null}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Actif</span>
            <Switch checked={problem.isActive} onCheckedChange={handleToggleActive} />
          </div>
          <p className="text-xs text-muted-foreground">Slug : {problem.slug}</p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Diagnostics ({problem.diagnostics.length})</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Icon name="plus" size="3.5" />
          Diagnostic
        </Button>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {problem.diagnostics.length === 0 ? (
        <EmptyState icon="badge-check" title="Aucun diagnostic" description="Ajoutez un diagnostic pour ce problème." />
      ) : (
        <div className="space-y-2">
          {problem.diagnostics.map((diag) => (
            <Link key={diag.id} href={`/admin/catalog/${domainId}/${params?.problemId}/${diag.id}`} className="block">
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between gap-3 pt-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{diag.name}</p>
                      <Badge variant={diag.isActive ? 'success' : 'neutral'}>
                        {diag.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    {diag.description ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{diag.description}</p>
                    ) : null}
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      {diag.difficulty ? <span>Difficulté : {diag.difficulty}</span> : null}
                      {diag.estimatedTime ? <span>Durée : {diag.estimatedTime}</span> : null}
                      <span>{diag._count?.interventions ?? 0} intervention{(diag._count?.interventions ?? 0) !== 1 ? 's' : ''}</span>
                    </div>
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
        title="Nouveau diagnostic"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)} disabled={creating}>Annuler</Button>
            <Button onClick={handleCreateDiagnostic} isLoading={creating} disabled={!newName.trim()}>Créer</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Nom" htmlFor="diagName" required>
            <Input id="diagName" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex. : Connecteur de charge endommagé" />
          </Field>
          <Field label="Slug" htmlFor="diagSlug" hint="Généré automatiquement si vide">
            <Input id="diagSlug" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} />
          </Field>
          <Field label="Description" htmlFor="diagDesc">
            <Textarea id="diagDesc" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} maxLength={1000} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Difficulté" htmlFor="diagDiff">
              <Input id="diagDiff" value={newDifficulty} onChange={(e) => setNewDifficulty(e.target.value)} placeholder="Facile / Moyen / Difficile" />
            </Field>
            <Field label="Durée estimée" htmlFor="diagTime">
              <Input id="diagTime" value={newEstTime} onChange={(e) => setNewEstTime(e.target.value)} placeholder="Ex. : 30-60 min" />
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
