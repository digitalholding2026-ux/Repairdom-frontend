'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui';
import { PageHeader } from '@/components/ui/page-header';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/cn';
import { formatFCFA } from '@/lib/format-fcfa';
import { normalizeCmPhone } from '@/lib/phone';
import { listCategories, listItems } from '@/lib/api/catalog-service';
import { createDemande } from '@/lib/api/request-service';
import { getPublicSettings } from '@/lib/api/settings-service';
import { useAuth } from '@/components/auth/auth-provider';
import { DemandeAuthModal } from '@/components/client/demande-auth-modal';

type Service = 'FRP' | 'SYSTEME' | 'SMARTPHONE';

const SERVICE_LABELS: Record<Service, string> = {
  FRP: 'Déblocage',
  SYSTEME: 'Système',
  SMARTPHONE: 'Smartphone',
};

const DRAFT_KEY = 'relio_demande_draft';

interface Draft {
  service: Service | null;
  brandId: string | null;
  modelId: string | null;
  modelPrice: number | null;
  problem: string;
  description: string;
  address: string;
  phone: string;
  discountCode: string;
  step: number;
}

const emptyDraft: Draft = {
  service: null,
  brandId: null,
  modelId: null,
  modelPrice: null,
  problem: '',
  description: '',
  address: '',
  phone: '',
  discountCode: '',
  step: 1,
};

const SERVICES: Service[] = ['FRP', 'SYSTEME', 'SMARTPHONE'];

const INTERVENTION_TYPES = [
  'Réinstallation OS',
  'Installation pilotes',
  'Nettoyage système',
  'Autre',
];

const PHONE_PROBLEM_TYPES = [
  'Écran',
  'Batterie',
  'Connecteur de charge',
  'Appareil photo',
  'Autre',
];

export function DemandeWizard() {
  const router = useRouter();
  const { user } = useAuth();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [loaded, setLoaded] = useState(false);

  /* Paramètres publics (nom WhatsApp, avatar du technicien) */
  const [settings, setSettings] = useState<{
    adminName: string;
    adminWhatsApp: string;
    adminAvatarUrl: string | null;
  } | null>(null);

  /* Auth + création de la demande */
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  /* Données déroulantes (FRP uniquement) */
  const [brands, setBrands] = useState<{ id: string; label: string }[]>([]);
  const [models, setModels] = useState<{ id: string; label: string; price: number | null }[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setDraft({ ...emptyDraft, ...JSON.parse(raw) });
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft, loaded]);

  /* Chargement des paramètres publics (avatar, numéro WhatsApp). */
  useEffect(() => {
    if (!loaded) return;
    void getPublicSettings()
      .then((s) => setSettings(s))
      .catch(() => {
        // Échec silencieux : on garde les valeurs par défaut codées en dur.
      });
  }, [loaded]);

  /* Quand le service change (ou redevient FRP), on recharge les marques. */
  useEffect(() => {
    if (!loaded || draft.service !== 'FRP') {
      setBrands([]);
      setModels([]);
      update({ brandId: null, modelId: null, modelPrice: null });
      return;
    }
    setLoadingBrands(true);
    listCategories('FRP')
      .then((cats) =>
        setBrands(
          cats.map((c) => ({ id: c.id, label: c.label })).sort((a, b) => a.label.localeCompare(b.label)),
        ),
      )
      .catch(() => setBrands([]))
      .finally(() => setLoadingBrands(false));
  }, [loaded, draft.service]);

  /* Quand une marque est choisie, on recharge ses modèles. */
  useEffect(() => {
    if (!loaded || draft.service !== 'FRP' || !draft.brandId) {
      setModels([]);
      update({ modelId: null, modelPrice: null });
      return;
    }
    setLoadingModels(true);
    listItems('FRP', draft.brandId)
      .then((items) =>
        setModels(
          items
            .filter((i) => i.price != null)
            .map((i) => ({ id: i.id, label: i.label, price: i.price }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        ),
      )
      .catch(() => setModels([]))
      .finally(() => setLoadingModels(false));
  }, [loaded, draft.service, draft.brandId]);

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  /* Validation de l'étape 3 :
   * - SMARTPHONE + non connecté : ouvre la modale d'inscription (obligatoire pour l'escrow).
   * - FRP / SYSTEME + non connecté : crée la demande en anonyme (pas de compte requis).
   * - Connecté : crée la demande directement. */
  const handleValidate = async () => {
    setCreateError(null);
    if (!user) {
      if (draft.service === 'SMARTPHONE') {
        setAuthModalOpen(true);
        return;
      }
      await createDemandeAnonymous();
      return;
    }
    await createDemandeAndRedirect();
  };

  /* Après authentification réussie (inscription ou connexion) : crée la
   * demande et redirige vers sa page de détail. */
  const handleAuthSuccess = async () => {
    setAuthModalOpen(false);
    await createDemandeAndRedirect();
  };

  /* Crée une demande en mode anonyme (pas de compte) et redirige vers la
   * page de suivi anonyme avec le trackingToken. */
  async function createDemandeAnonymous() {
    setCreating(true);
    setCreateError(null);
    try {
      const result = await createDemande({
        serviceCode: draft.service ?? 'FRP',
        address: draft.address,
        phone: draft.phone ?? '',
        description: draft.description || undefined,
        discountCode: draft.discountCode || undefined,
        brandId: draft.brandId ?? undefined,
        modelId: draft.modelId ?? undefined,
        problemId: draft.problem ?? undefined,
        finalAmount: draft.modelPrice ?? undefined,
      });

      localStorage.removeItem(DRAFT_KEY);
      const modelLabel = draft.modelId ? models.find((m) => m.id === draft.modelId)?.label ?? '' : '';
      router.push(
        `/demande/succes?reference=${encodeURIComponent(result.reference)}&id=${encodeURIComponent(result.id)}&service=${encodeURIComponent(draft.service ?? 'FRP')}&address=${encodeURIComponent(draft.address)}&model=${encodeURIComponent(modelLabel)}&price=${draft.modelPrice ?? 0}&depositAmount=${result.depositAmount ?? 0}`,
      );
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Erreur lors de la création de la demande.');
      setCreating(false);
    }
  }

  /* Appelle l'API de création de demande puis redirige vers /demande/succes
   * avec un bandeau différencié selon le service. */
  async function createDemandeAndRedirect() {
    setCreating(true);
    setCreateError(null);
    try {
      const result = await createDemande({
        serviceCode: draft.service ?? 'FRP',
        address: draft.address,
        phone: draft.phone ?? '',
        description: draft.description || undefined,
        discountCode: draft.discountCode || undefined,
        brandId: draft.brandId ?? undefined,
        modelId: draft.modelId ?? undefined,
        problemId: draft.problem ?? undefined,
        finalAmount: draft.modelPrice ?? undefined,
      });

      localStorage.removeItem(DRAFT_KEY);
      const modelLabel = draft.modelId ? models.find((m) => m.id === draft.modelId)?.label ?? '' : '';
      router.push(
        `/demande/succes?reference=${encodeURIComponent(result.reference)}&id=${encodeURIComponent(result.id)}&service=${encodeURIComponent(draft.service ?? 'FRP')}&address=${encodeURIComponent(draft.address)}&model=${encodeURIComponent(modelLabel)}&price=${draft.modelPrice ?? 0}&depositAmount=${result.depositAmount ?? 0}`,
      );
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Erreur lors de la création de la demande.');
      setCreating(false);
    }
  }

  const serviceLabel = SERVICE_LABELS[draft.service ?? 'FRP'];
  const isNextEnabled = () => Boolean(draft.address && draft.phone);

  /* Construit l'URL WhatsApp proprement avec les paramètres configurés. */
  const buildWhatsAppUrl = (phone: string, message: string): string | null => {
    const waNumber = phone.replace(/\+/g, '');
    const text = encodeURIComponent(message);
    return `https://wa.me/${waNumber}?text=${text}`;
  }

  if (!loaded) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <PageHeader title="Nouvelle demande" description={`Étape ${draft.step} sur 3`} />
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${(draft.step / 3) * 100}%` }} />
      </div>

      {/* Étape 1 : choix du service */}
      {draft.step === 1 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {SERVICES.map((s) => {
            const active = draft.service === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => update({ service: s, step: 2 })}
                className={cn(
                  'rounded-2xl border p-6 text-center font-semibold transition-colors',
                  active
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-muted/50',
                )}
              >
                {SERVICE_LABELS[s]}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Étape 2 : détails dynamiques + adresse/téléphone */}
      {draft.step === 2 ? (
        <Card>
          <CardContent className="space-y-4 pt-4">
            {draft.service === 'FRP' ? (
              <>
                <Field label="Marque">
                  <Select
                    value={draft.brandId ?? ''}
                    onChange={(e) => update({ brandId: e.target.value || null, modelId: null, modelPrice: null })}
                    disabled={loadingBrands}
                  >
                    <option value="">Choisir une marque</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label}
                      </option>
                    ))}
                  </Select>
                  {loadingBrands && <span className="text-xs text-muted-foreground">Chargement…</span>}
                </Field>

                {draft.brandId ? (
                  <Field label="Modèle">
                    <Select
                      value={draft.modelId ?? ''}
                      onChange={(e) => {
                        const m = models.find((x) => x.id === e.target.value);
                        update({ modelId: e.target.value || null, modelPrice: m?.price ?? null });
                      }}
                      disabled={loadingModels || models.length === 0}
                    >
                      <option value="">Choisir un modèle</option>
                      {models.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </Select>
                    {loadingModels && <span className="text-xs text-muted-foreground">Chargement…</span>}
                    {draft.modelPrice != null && (
                      <p className="mt-1 text-sm font-semibold text-primary">
                        Prix : {formatFCFA(draft.modelPrice)}
                      </p>
                    )}
                  </Field>
                ) : null}

                <Field label="Adresse (ville / quartier)">
                  <Input value={draft.address} onChange={(e) => update({ address: e.target.value })} />
                </Field>
                <Field label="Téléphone WhatsApp">
                  <Input value={draft.phone} onChange={(e) => update({ phone: e.target.value })} />
                </Field>
              </>
            ) : null}
            {draft.service === 'SYSTEME' ? (
              <>
                <Field label="Type d'intervention">
                  <Select
                    value={draft.problem}
                    onChange={(e) => update({ problem: e.target.value })}
                  >
                    <option value="">Choisir une intervention</option>
                    {INTERVENTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Décrivez votre demande">
                  <Textarea value={draft.description} onChange={(e) => update({ description: e.target.value })} />
                </Field>
              </>
            ) : null}
            {draft.service === 'SMARTPHONE' ? (
              <>
                <Field label="Type de panne">
                  <Select
                    value={draft.problem}
                    onChange={(e) => update({ problem: e.target.value })}
                  >
                    <option value="">Choisir une panne</option>
                    {PHONE_PROBLEM_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Décrivez votre demande (optionnel)">
                  <Textarea value={draft.description} onChange={(e) => update({ description: e.target.value })} />
                </Field>
              </>
            ) : null}
            {(draft.service === 'SYSTEME' || draft.service === 'SMARTPHONE') && (
              <>
                <Field label="Adresse (ville / quartier)">
                  <Input value={draft.address} onChange={(e) => update({ address: e.target.value })} />
                </Field>
                <Field label="Téléphone WhatsApp">
                  <Input value={draft.phone} onChange={(e) => update({ phone: e.target.value })} />
                </Field>
              </>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => update({ step: 1 })}>Précédent</Button>
              <Button onClick={() => update({ step: 3 })} disabled={!isNextEnabled()}>
                Suivant
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Étape 3 : récapitulatif + validation */}
      {draft.step === 3 ? (
        <Card>
          <CardContent className="space-y-4 pt-4">
            {createError ? (
              <Alert variant="error">{createError}</Alert>
            ) : null}
            <p className="text-sm text-muted-foreground">Récapitulatif</p>
            <ul className="space-y-1 text-sm">
              <li>Service : {serviceLabel}</li>
              {draft.modelId ? (
                <li>
                  Modèle : {models.find((m) => m.id === draft.modelId)?.label ?? draft.modelId}
                </li>
              ) : null}
              {draft.problem ? <li>Intervention : {draft.problem}</li> : null}
              {draft.description ? <li>Détail : {draft.description}</li> : null}
              <li>Adresse : {draft.address}</li>
              <li>Téléphone : {draft.phone}</li>
            </ul>

            {/* Code de réduction (B2B) — désactivé, disponible prochainement */}
            <Field
              label="Code de réduction (B2B)"
              htmlFor="wizard-discount-code"
              className="min-w-0"
            >
              <Input
                id="wizard-discount-code"
                value={draft.discountCode}
                onChange={(e) => update({ discountCode: e.target.value })}
                disabled
                placeholder="Bientôt disponible"
              />
              <p className="text-xs text-muted-foreground">
                Le code de réduction B2B sera bientôt disponible.
              </p>
            </Field>

            {/* Votre Technicien — uniquement SMARTPHONE */}
            {draft.service === 'SMARTPHONE' ? (
              <div className="rounded-2xl border border-success/30 bg-success/5 p-4">
                <div className="flex items-start gap-3">
                  <Avatar
                    src={settings?.adminAvatarUrl ?? '/admin.jpg'}
                    firstName={settings?.adminName ?? 'Technicien'}
                    lastName="Relio"
                    size="lg"
                    className="shrink-0"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Votre technicien</p>
                    <p className="text-xs text-muted-foreground">
                      Un technicien Relio s'occupera de votre appareil.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const phone = normalizeCmPhone(draft.phone);
                        if (!phone) return;
                        const message = `Bonjour ${settings?.adminName ?? 'Technicien'}, j'ai une demande de réparation smartphone en cours chez Relio. Pouvez-vous me contacter ?`;
                        const url = buildWhatsAppUrl(phone, message);
                        if (url) window.open(url, '_blank');
                      }}
                    >
                      Poser une question sur WhatsApp
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Paiement — SMARTPHONE : acompte 50% */}
            {draft.service === 'SMARTPHONE' ? (
              <div className="rounded-2xl border border-orange/30 bg-orange/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                      50%
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Acompte requis</p>
                    <p className="text-sm text-orange-900 font-semibold">
                      {draft.modelPrice != null ? formatFCFA(Math.round(draft.modelPrice / 2)) : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pour garantir votre réparation, un acompte de 50% est requis. Il sera bloqué en toute sécurité.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Paiement — FRP / SYSTEME : pas de paiement en ligne */}
            {(draft.service === 'FRP' || draft.service === 'SYSTEME') ? (
              <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-relio-card">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Aucun paiement en ligne. Vous réglerez à la fin de la réparation.
                </p>
              </div>
            ) : null}

            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => update({ step: 2 })}>Précédent</Button>
              <Button
                onClick={handleValidate}
                isLoading={creating}
                disabled={creating}
                className="flex-1"
              >
                {draft.service === 'SMARTPHONE'
                  ? 'Continuer vers le paiement sécurisé'
                  : draft.service === 'FRP' || draft.service === 'SYSTEME'
                    ? 'Envoyer ma demande'
                    : 'Valider ma demande'}
              </Button>
            </div>

            {authModalOpen ? (
              <DemandeAuthModal
                open={authModalOpen}
                onClose={() => setAuthModalOpen(false)}
                onSuccess={handleAuthSuccess}
                prefillPhone={draft.phone}
                city={draft.address}
                address={draft.address}
              />
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
