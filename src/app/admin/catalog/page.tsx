'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Icon } from '@/components/ui/icon';
import { Alert } from '@/components/ui/alert';
import { Field, Input, Textarea } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import {
  listDomains,
  createDomain,
  seedSmartphoneDomain,
  type CatalogDomain,
} from '@/lib/api/admin-service';

export default function AdminCatalogPage() {
  const [domains, setDomains] = useState<CatalogDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [seedBusy, setSeedBusy] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listDomains()
      .then((data) => { if (!cancelled) setDomains(data); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur de chargement.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const handleCreate = async () => {
    const name = newName.trim();
    const slug = newSlug.trim().toLowerCase() || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!name) return;
    setCreating(true);
    try {
      await createDomain({ name, slug, description: newDesc.trim() || undefined });
      setShowCreate(false);
      setNewName('');
      setNewSlug('');
      setNewDesc('');
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création.');
    } finally {
      setCreating(false);
    }
  };

  const handleSeed = async () => {
    if (!window.confirm('Créer le domaine Smartphone avec les données initiales ?')) return;
    setSeedBusy(true);
    setSeedResult(null);
    try {
      const result = await seedSmartphoneDomain();
      setSeedResult(result.message);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du seed.');
    } finally {
      setSeedBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Catalogue"
        description="Gérez les domaines, problèmes, diagnostics et tarifs RepairDom."
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(true)}>
              <Icon name="plus" size="3.5" />
              Domaine
            </Button>
          </div>
        }
      />

      {seedResult ? <Alert variant="success">{seedResult}</Alert> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={handleSeed} isLoading={seedBusy}>
          <Icon name="sparkles" size="3.5" />
          Seed Smartphone
        </Button>
        <p className="text-xs text-muted-foreground">Données initiales de démonstration</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : domains.length === 0 ? (
        <EmptyState
          icon="wrench"
          title="Aucun domaine"
          description="Créez un domaine ou utilisez le seed Smartphone pour commencer."
        />
      ) : (
        <div className="space-y-3">
          {domains.map((domain) => (
            <Link key={domain.id} href={`/admin/catalog/${domain.id}`} className="block">
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between gap-3 pt-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{domain.name}</p>
                      <Badge variant={domain.isActive ? 'success' : 'neutral'}>
                        {domain.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    {domain.description ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{domain.description}</p>
                    ) : null}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {domain._count?.problems ?? 0} problème{(domain._count?.problems ?? 0) !== 1 ? 's' : ''}
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
        title="Nouveau domaine"
        description="Ajoutez un nouveau domaine au catalogue RepairDom."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)} disabled={creating}>Annuler</Button>
            <Button onClick={handleCreate} isLoading={creating} disabled={!newName.trim()}>Créer</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Nom" htmlFor="domainName" required>
            <Input id="domainName" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex. : Smartphone" />
          </Field>
          <Field label="Slug" htmlFor="domainSlug" hint="Généré automatiquement si vide">
            <Input id="domainSlug" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="smartphone" />
          </Field>
          <Field label="Description" htmlFor="domainDesc">
            <Textarea id="domainDesc" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} maxLength={500} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
