'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { NotificationsCenter } from '@/components/notifications/notifications-center';

export default function TechnicienNotificationsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        description="Suivez les actions importantes de vos missions."
        backHref="/technicien"
      />
      <Link href="/technicien/demandes" className="block">
        <Button variant="secondary" className="w-full">
          <Icon name="zap" size="sm" />
          <span className="ml-1">Voir les missions disponibles</span>
        </Button>
      </Link>
      <NotificationsCenter detailHref={(demandeId) => `/technicien/demandes/${demandeId}`} />
    </div>
  );
}