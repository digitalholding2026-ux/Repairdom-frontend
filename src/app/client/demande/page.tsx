import type { Metadata } from 'next';
import { DemandeWizard } from '@/components/client/demande-wizard';

export const metadata: Metadata = {
  title: 'Nouvelle demande',
};

export default function DemandePage() {
  return (
    <div className="space-y-4">
      <DemandeWizard />
    </div>
  );
}