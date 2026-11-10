'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';

/* Chantier V2.1 — Le programme de fidélité (récompenses, parrainage, points)
 * est mis en pause pour le lancement V2 (opérateur unique, Smartphone).
 * La route est conservée pour éviter les 404 ; son contenu est remplacé
 * par un écran d'attente premium. Aucune logique V1 n'est conservée ici. */
export default function ClientRecompensesPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Programme de fidélité" backHref="/client" />
      <EmptyState
        icon={<Icon name="sparkles" size="lg" />}
        title="Programme de fidélité"
        description={
          'Cette fonctionnalité sera bientôt disponible. Nous préparons des surprises pour nos clients fidèles.'
        }
        action={
          <Link href="/client">
            <Button variant="secondary">Retour à l'accueil</Button>
          </Link>
        }
      />
    </div>
  );
}
