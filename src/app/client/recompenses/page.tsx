'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { GradientHeroCard } from '@/components/ui/gradient-hero-card';
import { Icon } from '@/components/ui/icon';
import { getMe, homePathForRole, type AuthUser } from '@/lib/api/auth-service';
import { listMyDemandeHistory, type DemandeListItem } from '@/lib/api/request-service';
import { HowItWorks, RewardCatalog } from '@/components/client/recompenses/reward-catalog';
import { RecompensesSkeleton } from '@/components/client/recompenses/recompenses-skeleton';

const FIRST_REWARD_TARGET = 5;

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

  const remaining = Math.max(FIRST_REWARD_TARGET - completedCount, 0);
  const progress = Math.min(completedCount / FIRST_REWARD_TARGET, 1);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mes récompenses & Cadeaux"
        description="Cumulez vos dépannages et débloquez des cadeaux exclusifs Relio."
      />

      <GradientHeroCard tone="brand">
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Niveau actuel
            </p>
            <p className="mt-1.5">
              <span className="figure tabular-nums text-4xl font-extrabold text-relio-orange-bright">
                {completedCount} / {FIRST_REWARD_TARGET}
              </span>{' '}
              <span className="text-sm font-medium text-slate-300">dépannages</span>
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {remaining === 0 ? (
                'Première récompense débloquée, bravo !'
              ) : (
                <>
                  Plus que {remaining} dépannage{remaining !== 1 ? 's' : ''} pour débloquer
                  votre première récompense !
                </>
              )}
            </p>
          </div>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white shadow-float">
            <Icon name="sparkles" size="lg" />
          </span>
        </div>
        <div
          className="relative mt-4 h-2.5 w-full overflow-hidden rounded-full bg-white/25"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progression vers la première récompense"
        >
          <div
            className="h-full rounded-full bg-relio-orange-bright shadow-[0_0_12px_rgba(255,149,0,0.7)] transition-all"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </GradientHeroCard>

      <section className="space-y-1">
        <SectionHeader title="Catalogue des récompenses" icon="sparkles" />
        <RewardCatalog completedCount={completedCount} />
      </section>

      <HowItWorks />
    </div>
  );
}
