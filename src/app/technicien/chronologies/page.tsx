'use client';

import { PageHeader } from '@/components/ui/page-header';
import { ChronologiesView } from '@/components/chronologies/chronologies-view';

export default function TechnicianChronologiesPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Chronologies"
        description="Suivez l'historique des étapes de chacune de vos missions."
        backHref="/technicien"
      />
      <ChronologiesView detailPrefix="/technicien/chronologies" badgeContext="technician" />
    </div>
  );
}