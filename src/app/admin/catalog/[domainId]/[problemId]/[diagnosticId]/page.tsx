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
  getDiagnostic,
  createIntervention,
  updateDiagnostic,
  createPricing,
  updatePricing,
  getPricing,
  updateIntervention,
  type CatalogDiagnosticDetail,
  type CatalogIntervention,
  type CatalogPricing,
  type CatalogPricingHistory,
} from '@/lib/api/admin-service';

const PRICING_HISTORY_FIELDS = [
  'minPrice',
  'referencePrice',
  'maxPrice',
  'travelFee',
  'serviceFee',
  'currency',
  'priceMode',
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
  const [diagnostic, setDiagnostic] = useState<CatalogDiagnosticDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateInt, setShowCreateInt] = useState(false);
  const [creatingInt, setCreatingInt] = useState(false);
  const [intName, setIntName] = useState('');
  const [intSlug, setIntSlug] = useState('');
  const [intDesc, setIntDesc] = useState('');
  const [intDiff, setIntDiff] = useState('');
  const [intTime, setIntTime] = useState('');
  const [intNeedsParts, setIntNeedsParts] = useState(false);

  const [pricingInterventionId, setPricingInterventionId] = useState<string | null>(null);
  const [pricingData, setPricingData] = useState<CatalogPricing | null>(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [refPrice, setRefPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [travelFee, setTravelFee] = useState('');
  const [serviceFee, setServiceFee] = useState('');
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
      setError(err instanceof Error ? err.message : 'Erreur de chargement.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  useEffect(() => { load(); }, [params?.diagnosticId]);

  const handleCreateIntervention = async () => {
    if (!params?.diagnosticId) return;
    const name = intName.trim();
    const slug = intSlug.trim().toLowerCase() || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!name) return;
    setCreatingInt(true);
    try {
      await createIntervention({
        diagnosticId: params.diagnosticId,
        name,
        slug,
        description: intDesc.trim() || undefined,
        difficulty: intDiff.trim() || undefined,
        estimatedTime: intTime.trim() || undefined,
        needsParts: intNeedsParts,
      });
      setShowCreateInt(false);
      setIntName('');
      setIntSlug('');
      setIntDesc('');
      setIntDiff('');
      setIntTime('');
      setIntNeedsParts(false);
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.');
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
      setError(err instanceof Error ? err.message : 'Erreur.');
    }
  };

  const handleToggleIntervention = async (interventionId: string, active: boolean) => {
    try {
      await updateIntervention(interventionId, { isActive: active });
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.');
    }
  };

  const handleOpenPricing = async (intervention: CatalogIntervention) => {
    setPricingInterventionId(intervention.id);
    setLoadingPricing(true);
    setPricingData(null);
    setMinPrice('');
    setRefPrice('');
    setMaxPrice('');
    setTravelFee('');
    setServiceFee('');
    setPricingActive(true);
    setPriceReason('');
    try {
      const pricing = await getPricing(intervention.id);
      setPricingData(pricing);
      setMinPrice(pricing.minPrice?.toString() ?? '');
      setRefPrice(pricing.referencePrice?.toString() ?? '');
      setMaxPrice(pricing.maxPrice?.toString() ?? '');
      setTravelFee(pricing.travelFee?.toString() ?? '');
      setServiceFee(pricing.serviceFee?.toString() ?? '');
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
      const payload: {
        interventionId: string;
        minPrice?: number;
        referencePrice?: number;
        maxPrice?: number;
        travelFee?: number;
        serviceFee?: number;
        isActive: boolean;
      } = { interventionId: pricingInterventionId, isActive: pricingActive };
      if (minPrice) payload.minPrice = parseFloat(minPrice);
      if (refPrice) payload.referencePrice = parseFloat(refPrice);
      if (maxPrice) payload.maxPrice = parseFloat(maxPrice);
      if (travelFee) payload.travelFee = parseFloat(travelFee);
      if (serviceFee) payload.serviceFee = parseFloat(serviceFee);

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
      setError(err instanceof Error ? err.message : 'Erreur sauvegarde tarif.');
    } finally {
      setSavingPricing(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>;
  if (!diagnostic) return <EmptyState title="Diagnostic introuvable" action={<Link href="/admin/catalog"><Button>Retour</Button></Link>} />;

  const { domainId, problemId } = (() => {
    const prob = diagnostic.problem;
    return { domainId: prob?.domain?.id ?? params?.domainId, problemId: prob?.id ?? params?.problemId };
  })();

  return (
    <div className="space-y-4">
      <PageHeader title={diagnostic.name} backHref={`/admin/catalog/${domainId}/${problemId}`} />

      <Card>
        <CardContent className="space-y-3 pt-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{diagnostic.problem?.domain?.name}</Badge>
            <Badge variant="outline">{diagnostic.problem?.name}</Badge>
          </div>
          {diagnostic.description ? <p className="text-sm text-muted-foreground">{diagnostic.description}</p> : null}
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            {diagnostic.difficulty ? <span>Difficulté : {diagnostic.difficulty}</span> : null}
            {diagnostic.estimatedTime ? <span>Durée : {diagnostic.estimatedTime}</span> : null}
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Actif</span>
            <Switch checked={diagnostic.isActive} onCheckedChange={handleToggleDiagnostic} />
          </div>
          <p className="text-xs text-muted-foreground">Slug : {diagnostic.slug}</p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Interventions ({diagnostic.interventions.length})</h2>
        <Button size="sm" onClick={() => setShowCreateInt(true)}>
          <Icon name="plus" size="3.5" />
          Intervention
        </Button>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {diagnostic.interventions.length === 0 ? (
        <EmptyState icon="wrench" title="Aucune intervention" description="Ajoutez une intervention pour ce diagnostic." />
      ) : (
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
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {intervention.difficulty ? <span>Difficulté : {intervention.difficulty}</span> : null}
                      {intervention.estimatedTime ? <span>Durée : {intervention.estimatedTime}</span> : null}
                      {intervention.needsParts ? <Badge variant="warning">Pièces requises</Badge> : null}
                    </div>
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
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenPricing(intervention)}
                    isLoading={loadingPricing && pricingInterventionId === intervention.id}
                  >
                    <Icon name="star" size="3.5" />
                    Tarif
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Intervention Modal */}
      <Modal
        open={showCreateInt}
        onClose={() => setShowCreateInt(false)}
        title="Nouvelle intervention"
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Difficulté" htmlFor="intDiff">
              <Input id="intDiff" value={intDiff} onChange={(e) => setIntDiff(e.target.value)} placeholder="Facile / Moyen / Difficile" />
            </Field>
            <Field label="Durée estimée" htmlFor="intTime">
              <Input id="intTime" value={intTime} onChange={(e) => setIntTime(e.target.value)} placeholder="30-60 min" />
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={intNeedsParts} onCheckedChange={setIntNeedsParts} aria-label="Nécessite des pièces" />
            <label htmlFor="intNeedsParts" className="text-sm">Nécessite des pièces</label>
          </div>
        </div>
      </Modal>

      {/* Inline Pricing Editor (bottom of page) */}
      {pricingInterventionId ? (
        <Card className="border-primary/30">
          <CardContent className="space-y-3 pt-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">
                Tarif — {diagnostic.interventions.find((i) => i.id === pricingInterventionId)?.name}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => { setPricingInterventionId(null); setPricingData(null); }}>
                <Icon name="x" size="3.5" />
              </Button>
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
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Prix min (XAF)" htmlFor="pMin" hint="Interne RepairDom">
                    <Input id="pMin" type="number" step="1" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="0" />
                  </Field>
                  <Field label="Prix référence (XAF)" htmlFor="pRef">
                    <Input id="pRef" type="number" step="1" value={refPrice} onChange={(e) => setRefPrice(e.target.value)} placeholder="0" />
                  </Field>
                  <Field label="Prix max (XAF)" htmlFor="pMax" hint="Interne RepairDom">
                    <Input id="pMax" type="number" step="1" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="0" />
                  </Field>
                  <Field label="Frais déplacement (XAF)" htmlFor="pTravel">
                    <Input id="pTravel" type="number" step="1" value={travelFee} onChange={(e) => setTravelFee(e.target.value)} placeholder="0" />
                  </Field>
                  <Field label="Frais RepairDom (XAF)" htmlFor="pService">
                    <Input id="pService" type="number" step="1" value={serviceFee} onChange={(e) => setServiceFee(e.target.value)} placeholder="0" />
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
      ) : null}
    </div>
  );
}
