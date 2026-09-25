'use client';

import { NotificationsCenter } from '@/components/notifications/notifications-center';

export default function ClientNotificationsPage() {
  return (
    <div className="space-y-4">
      <NotificationsCenter detailHref={(demandeId) => `/client/demandes/${demandeId}`} hub />
    </div>
  );
}