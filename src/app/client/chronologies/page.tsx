'use client';

import { PageHeader } from '@/components/ui/page-header';
import { ChronologiesView } from '@/components/chronologies/chronologies-view';

export default function ClientChronologiesPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Chronologies"
        description="Suivez l'historique des étapes de chacune de vos missions."
        backHref="/client"
      />
      <ChronologiesView detailPrefix="/client/chronologies" badgeContext="client" />
    </div>
  );
}