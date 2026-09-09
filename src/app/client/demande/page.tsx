import type { Metadata } from 'next';
import { DemandeWizard } from '@/components/client/demande-wizard';
import { PageHeader } from '@/components/ui/page-header';

export const metadata: Metadata = {
  title: 'Nouvelle demande',
};

export default function DemandePage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Nouvelle demande"
        description="Décrivez votre panne : nous nous occupons du reste."
      />
      <DemandeWizard />
    </div>
  );
}