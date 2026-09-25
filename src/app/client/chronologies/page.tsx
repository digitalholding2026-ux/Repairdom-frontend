'use client';

import { PageHeader } from '@/components/ui/page-header';
import { ChronologiesView } from '@/components/chronologies/chronologies-view';

export default function ClientChronologiesPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Chronologies"
        description="Suivez l'avancement de vos interventions en temps réel."
      />
      <ChronologiesView
        detailPrefix="/client/chronologies"
        badgeContext="client"
        educationalEmptyState
      />
    </div>
  );
}