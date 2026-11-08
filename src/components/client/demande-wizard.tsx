'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/cn';

type Service = 'FRP' | 'SYSTEME' | 'SMARTPHONE';

const DRAFT_KEY = 'relio_demande_draft';

interface Draft {
  service: Service | null;
  model: string;
  problem: string;
  description: string;
  address: string;
  phone: string;
  step: number;
}

const emptyDraft: Draft = {
  service: null,
  model: '',
  problem: '',
  description: '',
  address: '',
  phone: '',
  step: 1,
};

export function DemandeWizard() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [loaded, setLoaded] = useState(false);

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

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  if (!loaded) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <PageHeader title="Nouvelle demande" description={`Étape ${draft.step} sur 3`} />
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${(draft.step / 3) * 100}%` }} />
      </div>

      {draft.step === 1 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {(['FRP', 'SYSTEME', 'SMARTPHONE'] as Service[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => update({ service: s, step: 2 })}
              className={cn(
                'rounded-2xl border p-6 text-center font-semibold transition-colors',
                draft.service === s ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      {draft.step === 2 ? (
        <Card>
          <CardContent className="space-y-4 pt-4">
            {draft.service === 'FRP' ? (
              <Field label="Modèle Tecno">
                <Input value={draft.model} onChange={(e) => update({ model: e.target.value })} placeholder="Ex: Tecno Spark 10" />
              </Field>
            ) : null}
            {draft.service === 'SYSTEME' ? (
              <>
                <Field label="Type d'intervention">
                  <Input value={draft.problem} onChange={(e) => update({ problem: e.target.value })} placeholder="Réinstallation OS, pilotes…" />
                </Field>
                <Field label="Description">
                  <Textarea value={draft.description} onChange={(e) => update({ description: e.target.value })} />
                </Field>
              </>
            ) : null}
            {draft.service === 'SMARTPHONE' ? (
              <>
                <Field label="Type de panne">
                  <Input value={draft.problem} onChange={(e) => update({ problem: e.target.value })} placeholder="Écran, batterie, connecteur…" />
                </Field>
                <Field label="Description (optionnel)">
                  <Textarea value={draft.description} onChange={(e) => update({ description: e.target.value })} />
                </Field>
              </>
            ) : null}
            <Field label="Adresse (ville / quartier)">
              <Input value={draft.address} onChange={(e) => update({ address: e.target.value })} />
            </Field>
            <Field label="Téléphone WhatsApp">
              <Input value={draft.phone} onChange={(e) => update({ phone: e.target.value })} />
            </Field>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => update({ step: 1 })}>Précédent</Button>
              <Button onClick={() => update({ step: 3 })}>Suivant</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {draft.step === 3 ? (
        <Card>
          <CardContent className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">Récapitulatif</p>
            <ul className="space-y-1 text-sm">
              <li>Service : {draft.service}</li>
              {draft.model ? <li>Modèle : {draft.model}</li> : null}
              {draft.problem ? <li>Problème : {draft.problem}</li> : null}
              <li>Adresse : {draft.address}</li>
              <li>Téléphone : {draft.phone}</li>
            </ul>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => update({ step: 2 })}>Précédent</Button>
              <Button
                onClick={() => {
                  localStorage.removeItem(DRAFT_KEY);
                  router.push('/demande/succes');
                }}
              >
                Valider la demande
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
