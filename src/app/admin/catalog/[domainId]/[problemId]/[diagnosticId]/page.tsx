'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Icon } from '@/components/ui/icon';
import { Alert } from '@/components/ui/alert';
import { Field, Input, Textarea, Switch } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { CatalogSkeleton } from '@/components/admin/catalog/catalog-skeleton';
import { ResponsiveView } from '@/components/ui/responsive-view';
import { DeleteCatalogItem } from '@/components/admin/catalog/delete-catalog-item';
import { autoSlug } from '@/lib/slug';
import { extractErrorMessage } from '@/lib/errors';
import {
  getDiagnostic,
  createIntervention,
  updateDiagnostic,
  createPricing,
  updatePricing,
  getPricing,
  updateIntervention,
  deleteDiagnostic,
  deleteIntervention,
  deletePricing,
  type CatalogDiagnosticDetail,
  type CatalogIntervention,
  type CatalogPricing,
  type CatalogPricingHistory,
  type CatalogDeleteOutcome,
} from '@/lib/api/admin-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';

/* Catalogue simplifié — niveau 5 « Tarification » : chaque tarif affiche
 * Nom + Min / Prix courant / Barème (FCFA). Aucun champ durée / pièce / frais :
 * conservés en base pour le technicien et les snapshots devis, masqués ici.
 * L'historique (PricingHistory) reste consultable et immuable. */
const PRICING_HISTORY_FIELDS = [
  'minPrice',
  'referencePrice',
  'maxPrice',
  'isActive',
] as const;

function pricingDiffLines(h: CatalogPricingHistory): string[] {
  const lines: string[] = [];
  for (const field of PRICING_HISTORY_FIELDS) {
    const prev = h.previousValues?.[field];
    const next = h.newValues?.[field];
    if (prev === next) continue;
    const fmt = (v: unknown) => (v === null || v === undefined ? '—' : String(v));
    lines.push(`${field}: ${fmt(prev)} → ${fmt(next)}`);
  }
  return lines;
}

function pricingAuthorName(h: CatalogPricingHistory): string {
  if (!h.admin) return 'Admin';
  return [h.admin.firstName, h.admin.lastName].filter(Boolean).join(' ') || 'Admin';
}

export default function AdminDiagnosticPage() {
  const params = useParams<{ domainId: string; problemId: string; diagnosticId: string }>();
  const router = useRouter();
  const [diagnostic, setDiagnostic] = useState<CatalogDiagnosticDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [showCreateInt, setShowCreateInt] = useState(false);
  const [creatingInt, setCreatingInt] = useState(false);
  const [intName, setIntName] = useState('');
  const [intSlug, setIntSlug] = useState('');
  const [intDesc, setIntDesc] = useState('');

  const [pricingInterventionId, setPricingInterventionId] = useState<string | null>(null);
  /* Phase A : mise au premier plan de l'éditeur de tarif (rendu en bas de
   * page, hors viewport) à son ouverture. */
  const pricingEditorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (pricingInterventionId) {
      pricingEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [pricingInterventionId]);
  const [pricingData, setPricingData] = useState<CatalogPricing | null>(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [refPrice, setRefPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [pricingActive, setPricingActive] = useState(true);
  const [priceReason, setPriceReason] = useState('');
  const [savingPricing, setSavingPricing] = useState(false);

  async function load(quiet = false) {
    if (!params?.diagnosticId) return;
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const data = await getDiagnostic(params.diagnosticId);
      setDiagnostic(data);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Erreur de chargement.'));
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  useEffect(() => { load(); }, [params?.diagnosticId]);

  const handleCreateIntervention = async () => {
    if (!params?.diagnosticId) return;
    const name = intName.trim();
    const slug = intSlug.trim().toLowerCase() || autoSlug(name);
    if (!name) return;
    setCreatingInt(true);
    try {
      await createIntervention({
        diagnosticId: params.diagnosticId,
        name,
        slug,
        description: intDesc.trim() || undefined,
      });
      setShowCreateInt(false);
      setIntName('');
      setIntSlug('');
      setIntDesc('');
      await load(true);
    } catch (err) {
      setError(extractErrorMessage(err, 'Erreur.'));
    } finally {
      setCreatingInt(false);
    }
  };

  const handleToggleDiagnostic = async (active: boolean) => {
    if (!params?.diagnosticId) return;
    try {
      await updateDiagnostic(params.diagnosticId, { isActive: active });
      await load(true);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Erreur.'));
    }
  };

  const handleToggleIntervention = async (interventionId: string, active: boolean) => {
    try {
      await updateIntervention(interventionId, { isActive: active });
      await load(true);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Erreur.'));
    }
  };

  const handleOpenPricing = async (intervention: CatalogIntervention) => {
    setPricingInterventionId(intervention.id);
    setLoadingPricing(true);
    setPricingData(null);
    setMinPrice('');
    setRefPrice('');
    setMaxPrice('');
    setPricingActive(true);
    setPriceReason('');
    try {
      const pricing = await getPricing(intervention.id);
      setPricingData(pricing);
      setMinPrice(pricing.minPrice?.toString() ?? '');
      setRefPrice(pricing.referencePrice?.toString() ?? '');
      setMaxPrice(pricing.maxPrice?.toString() ?? '');
      setPricingActive(pricing.isActive);
    } catch {
      // no existing pricing — form stays empty
    } finally {
      setLoadingPricing(false);
    }
  };

  const handleSavePricing = async () => {
    if (!pricingInterventionId) return;
    setSavingPricing(true);
    try {
      // IA-2 — montants XAF entiers uniquement (jamais de décimaux) :
      // refus local explicite avant l'appel (le backend revalide : IsInt).
      const parseAmount = (raw: string, label: string): number | undefined => {
        const text = raw.trim();
        if (!text) return undefined;
        const value = Number(text);
        if (!Number.isInteger(value)) {
          throw new Error(`${label} doit être un montant entier en FCFA (sans décimales).`);
        }
        return value;
      };
      const payload: {
        interventionId: string;
        minPrice?: number;
        referencePrice?: number;
        maxPrice?: number;
        isActive: boolean;
      } = { interventionId: pricingInterventionId, isActive: pricingActive };
      const parsedMin = parseAmount(minPrice, 'Le prix min');
      if (parsedMin !== undefined) payload.minPrice = parsedMin;
      const parsedRef = parseAmount(refPrice, 'Le prix courant');
      if (parsedRef !== undefined) payload.referencePrice = parsedRef;
      const parsedMax = parseAmount(maxPrice, 'Le prix barème');
      if (parsedMax !== undefined) payload.maxPrice = parsedMax;

      if (pricingData) {
        const { interventionId: _ignored, ...rest } = payload;
        // Sprint 8.7 — motif de modification transmis au backend (null quand vide).
        await updatePricing(pricingInterventionId, {
          ...(rest as Record<string, unknown>),
          reason: priceReason.trim() ? priceReason.trim() : null,
        });
      } else {
        await createPricing(payload);
      }
      setPricingInterventionId(null);
      setPricingData(null);
      setPriceReason('');
      await load(true);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Erreur sauvegarde tarif.'));
    } finally {
      setSavingPricing(false);
    }
  };

  if (loading) return <CatalogSkeleton />;
  if (!diagnostic) return <EmptyState title="Diagnostic introuvable" action={<Link href="/admin/catalog"><Button>Retour</Button></Link>} />;

  const { domainId, problemId } = (() => {
    const prob = diagnostic.problem;
    return { domainId: prob?.domain?.id ?? params?.domainId, problemId: prob?.id ?? params?.problemId };
  })();

  const breadcrumbs = [
    { label: 'Catalogue', href: '/admin/catalog' },
    { label: diagnostic.problem?.domain?.name ?? 'Domaine', href: `/admin/catalog/${domainId}` },
    { label: diagnostic.problem?.name ?? 'Problème', href: `/admin/catalog/${domainId}/${problemId}` },
    { label: diagnostic.name },
  ];

  return (
    <div className="space-y-5">
      <Breadcrumbs items={breadcrumbs} />
      <PageHeader title={diagnostic.name} backHref={`/admin/catalog/${domainId}/${problemId}`} />
      {diagnostic.problem?.model ? (
        <Alert variant="info">
          Ce prix courant concerne le modèle : {diagnostic.problem.model.name}
          {diagnostic.problem?.brand ? ` (${diagnostic.problem.brand.name})` : ''} — Min / Prix courant / Barème propres à ce modèle.
        </Alert>
      ) : (
        <Alert variant="warning">
          Cette catégorie n&apos;est rattachée à aucun modèle précis : les tarifs existants restent consultables, mais aucun nouveau tarif ne peut être créé ici. Créez d&apos;abord la catégorie sous le modèle concerné.
        </Alert>
      )}
      {notice ? <Alert variant="success">{notice}</Alert> : null}

      <section className="space-y-3">
        <SectionHeader title="Informations" icon="info" />
        <Card>
          <CardContent className="space-y-3 pt-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{diagnostic.problem?.domain?.name}</Badge>
              <Badge variant="outline">{diagnostic.problem?.name}</Badge>
            </div>
            {diagnostic.description ? <p className="text-sm text-muted-foreground">{diagnostic.description}</p> : null}
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Actif</span>
              <Switch checked={diagnostic.isActive} onCheckedChange={handleToggleDiagnostic} />
            </div>
            <p className="text-xs text-muted-foreground">Slug : {diagnostic.slug}</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title={`Tarifs (${diagnostic.interventions.length})`}
          icon="wrench"
          description="Un tarif = Min / Prix courant / Barème en FCFA. Prix courant actif utilisé par le contrôle IA-6."
          action={
            diagnostic.problem?.model ? (
              <Button size="sm" onClick={() => setShowCreateInt(true)}>
                <Icon name="plus" size="3.5" />
                Tarif
              </Button>
            ) : undefined
          }
        />
        {error ? <Alert variant="error">{error}</Alert> : null}
        {diagnostic.interventions.length === 0 ? (
          <EmptyState icon={<Icon name="wrench" size="md" />} title="Aucun tarif" description="Ajoutez un tarif pour ce diagnostic (Min / Prix courant / Barème)." />
        ) : (
        <ResponsiveView
          mobile={
          <div className="space-y-2">
            {diagnostic.interventions.map((intervention) => (
              <Card key={intervention.id}>
                <CardContent className="space-y-2 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{intervention.name}</p>
                      {intervention.description ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">{intervention.description}</p>
                      ) : null}
                      <p className="mt-1 text-xs font-medium tabular-nums">
                        {intervention.pricing ? (
                          <>
                            Min {intervention.pricing.minPrice?.toLocaleString('fr-FR') ?? '—'} ·{' '}
                            Prix courant {intervention.pricing.referencePrice?.toLocaleString('fr-FR') ?? '—'} ·{' '}
                            Barème {intervention.pricing.maxPrice?.toLocaleString('fr-FR') ?? '—'} FCFA
                          </>
                        ) : (
                          <span className="text-muted-foreground">Sans tarif</span>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {intervention.isActive ? 'Actif' : 'Inactif'}
                      </span>
                      <Switch
                        aria-label={`Activer ou désactiver ${intervention.name}`}
                        checked={intervention.isActive}
                        onCheckedChange={(active) => handleToggleIntervention(intervention.id, active)}
                      />
                      <DeleteCatalogItem
                        itemLabel={intervention.name}
                        onDelete={() => deleteIntervention(intervention.id)}
                        onDone={(outcome: CatalogDeleteOutcome | null, err: string | null) => {
                          if (err) setError(err);
                          else if (outcome) setNotice(outcome.message);
                          void load(true);
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    {diagnostic.problem?.model ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="min-h-11 w-full"
                      onClick={() => handleOpenPricing(intervention)}
                      isLoading={loadingPricing && pricingInterventionId === intervention.id}
                    >
                      <Icon name="star" size="3.5" />
                      Tarif Min / Prix courant / Barème
                    </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          }
          desktop={
          <div className="grid gap-3 lg:grid-cols-2">
            {diagnostic.interventions.map((intervention) => (
              <Card key={intervention.id}>
                <CardContent className="space-y-2 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{intervention.name}</p>
                      {intervention.description ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">{intervention.description}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {intervention.isActive ? 'Actif' : 'Inactif'}
                      </span>
                      <Switch
                        aria-label={`Activer ou désactiver ${intervention.name}`}
                        checked={intervention.isActive}
                        onCheckedChange={(active) => handleToggleIntervention(intervention.id, active)}
                      />
                      <DeleteCatalogItem
                        itemLabel={intervention.name}
                        onDelete={() => deleteIntervention(intervention.id)}
                        onDone={(outcome: CatalogDeleteOutcome | null, err: string | null) => {
                          if (err) setError(err);
                          else if (outcome) setNotice(outcome.message);
                          void load(true);
                        }}
                      />
                    </div>
                  </div>
                  <dl className="grid grid-cols-3 gap-2 rounded-md bg-muted/50 p-2 text-center">
                    <div>
                      <dt className="text-[11px] text-muted-foreground">Min</dt>
                      <dd className="text-sm font-semibold tabular-nums">
                        {intervention.pricing?.minPrice?.toLocaleString('fr-FR') ?? '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-muted-foreground">Prix courant</dt>
                      <dd className="text-sm font-semibold tabular-nums">
                        {intervention.pricing?.referencePrice?.toLocaleString('fr-FR') ?? '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-muted-foreground">Barème</dt>
                      <dd className="text-sm font-semibold tabular-nums">
                        {intervention.pricing?.maxPrice?.toLocaleString('fr-FR') ?? '—'}
                      </dd>
                    </div>
                  </dl>
                  <div className="flex gap-2 pt-1">
                    {diagnostic.problem?.model ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenPricing(intervention)}
                      isLoading={loadingPricing && pricingInterventionId === intervention.id}
                    >
                      <Icon name="star" size="3.5" />
                      {intervention.pricing ? 'Modifier le tarif' : 'Définir le tarif'}
                    </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          }
          fallback={null}
        />
      )}
      </section>

      <section className="space-y-3">
        <SectionHeader title="Zone dangereuse" icon="alert" />
        <Card>
          <CardContent className="flex items-center justify-between gap-3 pt-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Supprimer ce diagnostic</p>
              <p className="text-xs text-muted-foreground">
                Suppression physique sans dépendance, désactivation sinon (historique conservé).
              </p>
            </div>
            <DeleteCatalogItem
              itemLabel={diagnostic.name}
              onDelete={() => deleteDiagnostic(diagnostic.id)}
              onDone={(outcome: CatalogDeleteOutcome | null, err: string | null) => {
                if (err) setError(err);
                else if (outcome?.action === 'DELETED') router.push(`/admin/catalog/${domainId}/${problemId}`);
                else if (outcome) {
                  setNotice(outcome.message);
                  void load(true);
                }
              }}
            />
          </CardContent>
        </Card>
      </section>

      {/* Create Tarif Modal */}
      <Modal
        open={showCreateInt}
        onClose={() => setShowCreateInt(false)}
        title="Nouveau tarif"
        description="Nom du tarif (ex. : Remplacement écran LCD). Les prix Min / Prix courant / Barème se définissent ensuite."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreateInt(false)} disabled={creatingInt}>Annuler</Button>
            <Button onClick={handleCreateIntervention} isLoading={creatingInt} disabled={!intName.trim()}>Créer</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Nom" htmlFor="intName" required>
            <Input id="intName" value={intName} onChange={(e) => setIntName(e.target.value)} placeholder="Ex. : Remplacement écran LCD" />
          </Field>
          <Field label="Slug" htmlFor="intSlug" hint="Généré automatiquement si vide">
            <Input id="intSlug" value={intSlug} onChange={(e) => setIntSlug(e.target.value)} />
          </Field>
          <Field label="Description" htmlFor="intDesc">
            <Textarea id="intDesc" value={intDesc} onChange={(e) => setIntDesc(e.target.value)} rows={2} maxLength={2000} />
          </Field>
        </div>
      </Modal>

      {/* Inline Pricing Editor (bottom of page) */}
      {pricingInterventionId ? (
        <div ref={pricingEditorRef} className="scroll-mt-20">
        <Card id="pricing-editor" className="border-primary/30">
          <CardContent className="space-y-3 pt-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">
                Tarif — {diagnostic.interventions.find((i) => i.id === pricingInterventionId)?.name}
              </h3>
              <div className="flex items-center gap-1">
                {pricingData ? (
                  <DeleteCatalogItem
                    itemLabel={`tarif ${diagnostic.interventions.find((i) => i.id === pricingInterventionId)?.name ?? ''}`}
                    onDelete={() => deletePricing(pricingInterventionId)}
                    onDone={(outcome: CatalogDeleteOutcome | null, err: string | null) => {
                      if (err) setError(err);
                      else if (outcome) setNotice(outcome.message);
                      setPricingInterventionId(null);
                      setPricingData(null);
                      void load(true);
                    }}
                  />
                ) : null}
                <Button variant="ghost" size="sm" onClick={() => { setPricingInterventionId(null); setPricingData(null); }}>
                  <Icon name="x" size="3.5" />
                </Button>
              </div>
            </div>
            {loadingPricing ? (
              <div className="flex items-center justify-center py-6"><Spinner /></div>
            ) : (
              <div className="space-y-3">
                {pricingData?.history?.length ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Historique des modifications :</p>
                    {pricingData.history.map((h) => (
                      <div key={h.id} className="rounded-md border p-2">
                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{pricingAuthorName(h)}</span>
                          <span>{new Date(h.createdAt).toLocaleString('fr-FR')}</span>
                          {h.reason ? <span className="italic">— {h.reason}</span> : null}
                        </div>
                        {pricingDiffLines(h).length > 0 ? (
                          <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                            {pricingDiffLines(h).map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Min (FCFA)" htmlFor="pMin">
                    <Input id="pMin" type="number" step="1" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="0" />
                  </Field>
                  <Field label="Prix courant (FCFA)" htmlFor="pRef">
                    <Input id="pRef" type="number" step="1" value={refPrice} onChange={(e) => setRefPrice(e.target.value)} placeholder="0" />
                  </Field>
                  <Field label="Barème (FCFA)" htmlFor="pMax">
                    <Input id="pMax" type="number" step="1" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="0" />
                  </Field>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">Tarif actif</span>
                  <Switch checked={pricingActive} onCheckedChange={setPricingActive} />
                </div>
                {pricingData ? (
                  <Field
                    label="Motif de modification"
                    htmlFor="pReason"
                    hint="Ex. : Hausse du prix des pièces, nouveau tarif fournisseur, correction tarifaire"
                  >
                    <Textarea
                      id="pReason"
                      value={priceReason}
                      onChange={(e) => setPriceReason(e.target.value)}
                      rows={2}
                      maxLength={500}
                    />
                  </Field>
                ) : null}
                <Button onClick={handleSavePricing} isLoading={savingPricing} className="w-full">
                  {pricingData ? 'Modifier le tarif' : 'Créer le tarif'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      ) : null}
    </div>
  );
}
