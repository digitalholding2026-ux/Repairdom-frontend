'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { SectionHeader } from '@/components/ui/page-header';
import { SkeletonRow } from '@/components/ui/skeleton';
import type { AdminAiConversationFlag, AdminAiPricingCheck, AdminAiWarning } from '@/lib/api/admin-service';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { categoryLabel, signalBadge, surveillanceLevelText } from './ai-dashboard-helpers';

/* IA-9 §18 — vue technicien : avertissements + niveau + contrôles + flags
 * regroupés en événements séparés (jamais de score global). */

export interface AiTechnicianData {
  warnings: { items: AdminAiWarning[]; loading: boolean };
  level: { surveillanceLevel: number; humanReviewRequired: boolean } | null;
  checks: AdminAiPricingCheck[];
  flags: AdminAiConversationFlag[];
  loading: boolean;
  error: string | null;
  load: () => void;
}

export function AiTechnicianView({
  data,
  technicianId,
  setTechnicianId,
}: {
  data: AiTechnicianData;
  technicianId: string;
  setTechnicianId: (id: string) => void;
}) {
  const [draft, setDraft] = useState(technicianId);
  const search = () => {
    setTechnicianId(draft.trim());
    data.load();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Field label="Identifiant technicien" htmlFor="ai-tech-search">
          <Input
            id="ai-tech-search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="UUID du technicien"
            aria-label="Identifiant technicien"
          />
        </Field>
        <div className="flex items-end">
          <Button onClick={search} className="w-full sm:w-auto">
            <Icon name="search" size="sm" />
            <span className="ml-1">Charger</span>
          </Button>
        </div>
      </div>

      {data.error ? <Alert variant="error">{data.error}</Alert> : null}
      {data.loading ? (
        <div className="space-y-3" role="status">
          <span className="sr-only">Chargement…</span>
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : null}

      {!data.loading && !data.error && technicianId ? (
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-1 py-4">
              <SectionHeader title="Niveau de surveillance (IA-7)" />
              {data.level ? (
                <>
                  <p className="text-sm font-semibold tabular-nums">Niveau {data.level.surveillanceLevel}</p>
                  <p className="text-xs text-muted-foreground">{surveillanceLevelText(data.level.surveillanceLevel)}</p>
                  {data.level.humanReviewRequired ? (
                    <Alert variant="warning">Réexamen humain requis — à examiner, pas à sanctionner.</Alert>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Niveau 0 — aucun signal tarifaire enregistré.</p>
              )}
            </CardContent>
          </Card>

          <section aria-label="Avertissements du technicien">
            <SectionHeader title={`Avertissements (${data.warnings.items.length})`} />
            <div className="space-y-2">
              {data.warnings.items.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun avertissement.</p>
              ) : (
                data.warnings.items.map((w) => (
                  <Card key={w.id}>
                    <CardContent className="flex flex-wrap items-center gap-2 py-3">
                      <Badge variant={signalBadge('warning', w.status).variant}>
                        {signalBadge('warning', w.status).label}
                      </Badge>
                      <span className="text-xs tabular-nums">
                        {w.pricing ? `${formatCurrency(w.pricing.proposedPrice, 'XAF')} / max ${w.pricing.maxAtCheck !== null ? formatCurrency(w.pricing.maxAtCheck, 'XAF') : '—'}` : w.quoteId.slice(0, 8)}
                      </span>
                      <span className="text-2xs text-muted-foreground">{formatDateTime(w.createdAt)}</span>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </section>

          <section aria-label="Contrôles tarifaires du technicien">
            <SectionHeader title={`Contrôles tarifaires (${data.checks.length})`} />
            <div className="space-y-2">
              {data.checks.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun contrôle.</p>
              ) : (
                data.checks.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="flex flex-wrap items-center gap-2 py-3">
                      <Badge variant={signalBadge('pricing', c.result).variant}>
                        {signalBadge('pricing', c.result).label}
                      </Badge>
                      <span className="text-xs tabular-nums">{formatCurrency(c.proposedPrice, 'XAF')}</span>
                      <span className="text-2xs text-muted-foreground">{c.quote?.demande?.reference ?? c.demandeId.slice(0, 8)}</span>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </section>

          <section aria-label="Signaux conversation du technicien">
            <SectionHeader title={`Signaux conversation (${data.flags.length})`} />
            <div className="space-y-2">
              {data.flags.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun signal.</p>
              ) : (
                data.flags.map((f) => (
                  <Card key={f.id}>
                    <CardContent className="flex flex-wrap items-center gap-2 py-3">
                      <Badge variant={signalBadge('flag', f.status).variant}>
                        {signalBadge('flag', f.status).label}
                      </Badge>
                      <Badge variant={signalBadge('severity', f.severity).variant}>
                        {signalBadge('severity', f.severity).label}
                      </Badge>
                      <span className="text-xs">{categoryLabel(f.category)}</span>
                      <span className="text-2xs text-muted-foreground">{formatDateTime(f.createdAt)}</span>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}

      {!technicianId && !data.loading ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Icon name="users" size="lg" />}
              title="Rechercher un technicien"
              description="Saisissez son identifiant pour regrouper avertissements, contrôles et signaux."
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
