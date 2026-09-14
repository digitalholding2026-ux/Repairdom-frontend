'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { getMe, homePathForRole, type AuthUser } from '@/lib/api/auth-service';
import { listMyDemandeHistory, type DemandeListItem } from '@/lib/api/request-service';
import { RecompensesOverview, RecompensesPlaceholder } from '@/components/client/recompenses/recompenses-overview';
import { RecompensesSkeleton } from '@/components/client/recompenses/recompenses-skeleton';

export default function ClientRecompensesPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then(async (me) => {
        if (cancelled) return;
        if (me.role !== 'CLIENT') {
          router.replace(homePathForRole(me.role));
          return;
        }
        setUser(me);
        const history = await listMyDemandeHistory().catch(() => []);
        if (!cancelled) {
          setCompletedCount(history.filter((d: DemandeListItem) => d.status === 'CONFIRMED').length);
        }
      })
      .catch(() => router.replace('/client/connexion'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [router]);

  if (loading) return <RecompensesSkeleton />;

  if (!user) return null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mes récompenses"
        description="Suivez votre progression vers vos prochaines récompenses."
        backHref="/client"
      />

      <RecompensesOverview completedCount={completedCount} />

      <section className="space-y-3">
        <SectionHeader title="Programme fidélité" />
        <RecompensesPlaceholder />
      </section>
    </div>
  );
}