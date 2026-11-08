'use client';

import { PageHeader } from '@/components/ui/page-header';

export default function SuccesPage() {
  return (
    <div className="p-8">
      <PageHeader
        title="Demande envoyée"
        description="Votre demande a bien été enregistrée."
      />
      <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <h3 className="text-sm font-semibold mb-2">Et maintenant ?</h3>
        <p className="text-sm">
          Un technicien vous contactera sur{' '}
          <span className="font-medium">WhatsApp</span> pour confirmer votre
          rendez-vous. Aucun paiement en ligne n&apos;est requis pour le moment :
          le règlement se fait à la fin de l&apos;intervention (sauf réparation
          smartphone : paiement en ligne par escrow).
        </p>
      </div>
    </div>
  );
}
