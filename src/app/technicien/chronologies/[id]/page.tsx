'use client';

import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { ChronologyDetail } from '@/components/chronologies/chronology-detail';

export default function TechnicianChronologyDetailPage() {
  const params = useParams<{ id: string }>();
  return (
    <div className="space-y-4">
      <PageHeader title="Chronologie de la mission" backHref="/technicien/chronologies" />
      <ChronologyDetail
        missionId={params?.id}
        backHref="/technicien/chronologies"
        badgeContext="technician"
      />
    </div>
  );
}