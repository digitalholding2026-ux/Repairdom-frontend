'use client';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { SectionHeader } from '@/components/ui/page-header';
import { SkeletonCard } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import type { AdminAiOverview } from '@/lib/api/admin-service';
import { formatDateTime } from '@/lib/format';

/* IA-9 — vue d'ensemble (compteurs factuels backend, grille responsive
 * commune aux deux supports ; jamais de score global de risque). */

export function AiOverviewView({
  overview,
  loading,
  error,
  reload,
}: {
  overview: AdminAiOverview | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3" role="status">
        <span className="sr-only">Chargement…</span>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }
  if (error) {
    return (
      <Alert
        variant="error"
        action={
          <Button variant="secondary" size="sm" onClick={reload}>
            Réessayer
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }
  if (!overview) {
    return (
      <Card>
        <CardContent>
          <EmptyState title="Aucune donnée" description="Les signaux IA apparaîtront ici dès leur création." />
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      <PageHeader
        title="Surveillance IA"
        description="Signaux IA-4 → IA-8 : voir et examiner. Aucune décision automatique."
      />
      <section aria-label="File de revue prioritaire">
        <SectionHeader title="À examiner en priorité" icon="alert" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard icon="alert" label="Avertissements en attente (IA-7)" value={overview.warnings.pending} />
          <StatCard icon="alert" label="Justifications dépassées (dérivé)" value={overview.warnings.expiredEffective} />
          <StatCard icon="shield-check" label="Signaux HIGH ouverts (IA-8)" value={overview.conversationFlags.highOpen} />
        </div>
      </section>
      <section aria-label="Classifications et mappings">
        <SectionHeader title="Demandes & diagnostics" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard icon="file" label="Classifications IA-4" value={overview.classifications.total} />
          <StatCard icon="search" label="Mappings IA-5" value={overview.mappings.total} />
          <StatCard icon="briefcase" label="Contrôles tarifaires IA-6" value={overview.pricingChecks.total} />
        </div>
      </section>
      <section aria-label="Détail par statut">
        <SectionHeader title="Historique des revues" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard icon="check-circle" label="Avertissements justifiés" value={overview.warnings.justified} />
          <StatCard icon="check-circle" label="Avertissements examinés" value={overview.warnings.reviewed} />
          <StatCard icon="check-circle" label="Signaux conversation examinés" value={overview.conversationFlags.reviewed} />
          <StatCard icon="x" label="Signaux conversation écartés" value={overview.conversationFlags.dismissed} />
          <StatCard icon="chat" label="Signaux conversation ouverts" value={overview.conversationFlags.open} />
          <StatCard icon="clock" label="Données au" value={formatDateTime(overview.generatedAt)} />
        </div>
      </section>
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Icon name="info" size="sm" className="mt-0.5 shrink-0" />
        Chaque signal reste un fait individuel à examiner par onglet. Aucun score global n&apos;est calculé ;
        toute décision reste humaine.
      </p>
    </div>
  );
}
