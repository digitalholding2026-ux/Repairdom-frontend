'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Icon } from '@/components/ui/icon';
import { Alert } from '@/components/ui/alert';
import { Field, Input, Select, Textarea } from '@/components/ui';
import { REQUEST_CATEGORIES } from '@/lib/data/request-categories';
import { Modal } from '@/components/ui/modal';
import { ResponsiveView } from '@/components/ui/responsive-view';
import { CatalogSkeleton } from '@/components/admin/catalog/catalog-skeleton';
import { DeleteCatalogItem } from '@/components/admin/catalog/delete-catalog-item';
import { autoSlug } from '@/lib/slug';
import {
  listDomains,
  createDomain,
  deleteDomainHard,
  seedSmartphoneDomain,
  type CatalogDomain,
  type CatalogDeleteOutcome,
} from '@/lib/api/admin-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';

/* Catalogue simplifié — niveau 1 « Catalogue / Type d'appareil »
 * (Smartphone, Télévision, …). Hiérarchie :
 * Catalogue → Spécification → Modèle → Catégorie → Tarification
 * (Min / Prix courant / Barème). Mobile = liste verticale tactile,
 * Desktop = grille deux colonnes (structures distinctes, §13). */

function DomainCard({
  domain,
  onDone,
  onError,
}: {
  domain: CatalogDomain;
  onDone: (outcome: CatalogDeleteOutcome | null, err: string | null) => void;
  onError: (err: string) => void;
}) {
  return (
    <Card className="transition-colors hover:bg-muted/50">
      <CardContent className="flex items-center justify-between gap-3 pt-4">
        <Link href={`/admin/catalog/${domain.id}`} className="min-w-0 flex-1" aria-label={`Ouvrir ${domain.name}`}>
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
              {domain._count?.problems ?? 0} catégorie{(domain._count?.problems ?? 0) !== 1 ? 's' : ''}
            </p>
          </div>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <DeleteCatalogItem
            itemLabel={domain.name}
            hard
            onDelete={() => deleteDomainHard(domain.id)}
            onDone={(outcome, err) => {
              if (err) onError(err);
              else onDone(outcome, null);
            }}
          />
          <Icon name="chevron-right" size="sm" className="shrink-0 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

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
  const [newCategory, setNewCategory] = useState('informatique');
  const [seedBusy, setSeedBusy] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const [confirmSeedOpen, setConfirmSeedOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listDomains()
      .then((data) => { if (!cancelled) setDomains(data); })
      .catch((err) => { if (!cancelled) setError(toUserErrorMessage(err, 'Erreur de chargement.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const handleCreate = async () => {
    const name = newName.trim();
    const slug = autoSlug(newSlug) || autoSlug(name);
    if (!name || !newCategory) return;
    setCreating(true);
    try {
      await createDomain({ name, slug, description: newDesc.trim() || undefined, category: newCategory });
      setShowCreate(false);
      setNewName('');
      setNewSlug('');
      setNewDesc('');
      setNewCategory('informatique');
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Erreur lors de la création.'));
    } finally {
      setCreating(false);
    }
  };

  const handleSeed = async () => {
    setConfirmSeedOpen(false);
    setSeedBusy(true);
    setSeedResult(null);
    try {
      const result = await seedSmartphoneDomain();
      setSeedResult(result.message);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Erreur lors du seed.'));
    } finally {
      setSeedBusy(false);
    }
  };

  const handleDone = (outcome: CatalogDeleteOutcome | null, err: string | null) => {
    if (err) setError(err);
    else if (outcome) setNotice(outcome.message);
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Catalogue"
        description="Types d'appareils Relio — Catalogue → Spécification → Modèle → Catégorie → Tarification (Min / Prix courant / Barème)."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/catalog/villes">
              <Button variant="secondary" size="sm">
                <Icon name="pin" size="3.5" />
                Villes et zones
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(true)}>
              <Icon name="plus" size="3.5" />
              Type d&apos;appareil
            </Button>
          </div>
        }
      />

      {seedResult ? <Alert variant="success">{seedResult}</Alert> : null}
      {notice ? <Alert variant="success">{notice}</Alert> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}

      {process.env.NODE_ENV !== 'production' ? (
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setConfirmSeedOpen(true)} isLoading={seedBusy}>
            <Icon name="sparkles" size="3.5" />
            Seed Smartphone
          </Button>
          <p className="text-xs text-muted-foreground">Données initiales de démonstration</p>
        </div>
      ) : null}

      {loading ? (
        <CatalogSkeleton />
      ) : domains.length === 0 ? (
        <EmptyState
          icon={<Icon name="wrench" size="md" />}
          title="Aucun type d'appareil"
          description="Créez un type d'appareil ou utilisez le seed Smartphone pour commencer."
        />
      ) : (
        <ResponsiveView
          mobile={
            <div className="space-y-3">
              {domains.map((domain) => (
                <DomainCard key={domain.id} domain={domain} onDone={handleDone} onError={setError} />
              ))}
            </div>
          }
          desktop={
            <div className="grid gap-3 lg:grid-cols-2">
              {domains.map((domain) => (
                <DomainCard key={domain.id} domain={domain} onDone={handleDone} onError={setError} />
              ))}
            </div>
          }
          fallback={<CatalogSkeleton />}
        />
      )}

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nouveau type d'appareil"
        description="Ajoutez un catalogue au référentiel Relio (ex. : Smartphone, Télévision)."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)} disabled={creating}>Annuler</Button>
            <Button onClick={handleCreate} isLoading={creating} disabled={!newName.trim() || !newCategory}>Créer</Button>
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
          <Field label="Catégorie métier" htmlFor="domainCategory" required hint="Détermine le routage des demandes. Sans catégorie valide, les demandes sur ce catalogue sont rejetées.">
            <Select id="domainCategory" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
              <option value="">Sélectionnez une catégorie</option>
              {REQUEST_CATEGORIES.filter((c) => c.id !== 'autre').map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmSeedOpen}
        onCancel={() => setConfirmSeedOpen(false)}
        onConfirm={handleSeed}
        title="Seed Smartphone"
        description="Créer le domaine Smartphone avec les données initiales ?"
        confirmLabel="Lancer le seed"
      />
    </div>
  );
}
