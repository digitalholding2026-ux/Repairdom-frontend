'use client';

import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { ChronologyDetail } from '@/components/chronologies/chronology-detail';

export default function ClientChronologyDetailPage() {
  const params = useParams<{ id: string }>();
  return (
    <div className="space-y-4">
      <PageHeader title="Chronologie de la mission" backHref="/client/chronologies" />
      <ChronologyDetail missionId={params?.id} backHref="/client/chronologies" badgeContext="client" />
    </div>
  );
}