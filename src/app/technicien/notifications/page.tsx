'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { NotificationsCenter } from '@/components/notifications/notifications-center';
import { useNotificationsCenter } from '@/lib/notifications/use-notifications-center';

export default function TechnicianNotificationsPage() {
  const center = useNotificationsCenter('TECHNICIAN');

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        description="Ce qui requiert votre attention, puis le suivi de vos missions."
        backHref="/technicien"
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
      <Link href="/technicien/demandes" className="block">
        <Button variant="secondary" className="w-full">
          <Icon name="zap" size="sm" />
          Voir les missions disponibles
        </Button>
      </Link>
    </div>
  );
}