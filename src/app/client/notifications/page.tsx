'use client';

import { PageHeader } from '@/components/ui/page-header';
import { NotificationsCenter } from '@/components/notifications/notifications-center';

export default function ClientNotificationsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        description="Suivez les actions importantes de vos missions."
        backHref="/client"
      />
      <NotificationsCenter detailHref={(demandeId) => `/client/demandes/${demandeId}`} />
    </div>
  );
}