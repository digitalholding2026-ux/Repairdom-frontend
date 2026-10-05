'use client';

import { PageHeader } from '@/components/ui/page-header';
import { NotificationsCenter } from '@/components/notifications/notifications-center';
import { useNotificationsCenter } from '@/lib/notifications/use-notifications-center';

export default function ClientNotificationsPage() {
  const center = useNotificationsCenter('CLIENT');

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        description="Ce qui requiert votre attention, puis le suivi de vos missions."
        backHref="/client"
      />
      <NotificationsCenter
        role={center.centerProps.role}
        notifications={center.centerProps.notifications}
        onOpen={center.centerProps.onOpen}
        onMarkAllRead={center.onMarkAllRead}
        onMarkGroupRead={center.onMarkGroupRead}
        loading={center.loading}
        error={center.error}
        busy={center.busy}
        freshIds={center.freshIds}
      />
    </div>
  );
}