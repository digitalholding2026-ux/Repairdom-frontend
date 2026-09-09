'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Spinner } from '@/components/ui/spinner';
import { DemandeCard } from '@/components/client/demande-card';
import { getMe, logout, homePathForRole } from '@/lib/api/auth-service';
import { listMyDemandes, type DemandeListItem } from '@/lib/api/request-service';
import { formatRequestedTiming } from '@/lib/request-timing';
import { cn } from '@/lib/cn';

export type ClientDashboardVariant = 'home' | 'list';

const FILTERS = [
  { id: 'all', label: 'Toutes' },
  { id: 'active', label: 'En cours' },
  { id: 'done', label: 'Terminées' },
  { id: 'canceled', label: 'Annulées' },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];

const ACTIVE_STATUSES = ['SUBMITTED', 'PENDING', 'ACCEPTED', 'SCHEDULED', 'IN_PROGRESS'];
const DONE_STATUSES = ['COMPLETED', 'CONFIRMED'];
const CANCELED_STATUSES = ['CANCELED'];

function matchFilter(status: string, filter: FilterId): boolean {
  if (filter === 'active') return ACTIVE_STATUSES.includes(status);
  if (filter === 'done') return DONE_STATUSES.includes(status);
  if (filter === 'canceled') return CANCELED_STATUSES.includes(status);
  return true;
}

export function ClientDashboard({ variant = 'home' }: { variant?: ClientDashboardVariant }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState<string | null>(null);
  const [demandes, setDemandes] = useState<DemandeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>('all');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const me = await getMe();
        if (cancelled) return;
        if (me.role !== 'CLIENT') {
          router.replace(homePathForRole(me.role));
          return;
        }
        const list = await listMyDemandes();
        if (!cancelled) {
          setFirstName(me.firstName ?? null);
          setDemandes(list);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur de chargement.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const filtered = useMemo(
    () => demandes.filter((d) => matchFilter(d.status, filter)),
    [demandes, filter],
  );

  const activeCount = useMemo(
    () => demandes.filter((d) => ACTIVE_STATUSES.includes(d.status)).length,
    [demandes],
  );
  const doneCount = useMemo(
    () => demandes.filter((d) => DONE_STATUSES.includes(d.status)).length,
    [demandes],
  );

  const currentMission = useMemo(() => {
    const active = demandes
      .filter((d) => ACTIVE_STATUSES.includes(d.status))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return active[0] ?? null;
  }, [demandes]);

  const recent = useMemo(
    () =>
      [...demandes]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3),
    [demandes],
  );

  const handleLogout = async () => {
    await logout();
    window.location.href = '/client/connexion';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Accès requis"
        description={error}
        action={
          <Link href="/client/connexion">
            <Button>Se connecter en tant que client</Button>
          </Link>
        }
      />
    );
  }

  if (variant === 'list') {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Mes demandes"
          description="Suivez vos demandes, devis et interventions."
        />

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Filtrer les demandes">
          {FILTERS.map((tab) => {
            const active = tab.id === filter;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(tab.id)}
                className={cn(
                  'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:opacity-90',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="Aucune demande"
            description={
              filter === 'all'
                ? 'Vous n’avez encore déposé aucune demande de dépannage.'
                : 'Aucune demande ne correspond à ce filtre pour le moment.'
            }
            action={
              <Link href="/client/demande">
                <Button>Déposer une panne</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((d) => (
              <Link key={d.id} href={`/client/demandes/${d.id}`} className="block">
                <DemandeCard demande={d} />
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Bonjour{firstName ? ` ${firstName}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground">Que souhaitez-vous faire aujourd’hui ?</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Déconnexion
        </Button>
      </section>

      <section>
        <Link href="/client/demande" className="block">
          <Button size="lg" className="w-full">
            <Icon name="plus" strokeWidth={2.2} />
            Déposer une panne
          </Button>
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <QuickStat icon="clock" label="En cours" value={activeCount} href="/client/demandes" />
        <QuickStat icon="check-circle" label="Terminées" value={doneCount} href="/client/demandes" />
      </section>

      {currentMission ? (
        <section className="space-y-3">
          <SectionHeader title="Intervention en cours" />
          <Link href={`/client/demandes/${currentMission.id}`} className="block">
            <Card className="overflow-hidden transition-colors hover:bg-muted/50">
              <div className="border-t-2 border-primary">
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-mono text-sm font-semibold text-primary">
                      {currentMission.reference}
                    </span>
                    <Badge variant="outline">Suivre</Badge>
                  </div>
                  <p className="text-sm font-medium">{currentMission.categoryLabel}</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {currentMission.description}
                  </p>
                  <p className="text-xs font-medium text-foreground">
                    {currentMission.requestedMode === 'SCHEDULED' ? 'Intervention souhaitée' : 'Intervention'} :{' '}
                    {formatRequestedTiming(currentMission.requestedMode, currentMission.requestedAt)}
                  </p>
                </CardContent>
              </div>
            </Card>
          </Link>
        </section>
      ) : demandes.length === 0 ? (
        <EmptyState
          title="Vous n’avez encore aucune demande"
          description="Décrivez votre panne et nous trouvons le technicien adapté près de chez vous."
          action={
            <Link href="/client/demande">
              <Button>Déposer une panne</Button>
            </Link>
          }
        />
      ) : null}

      {recent.length > 0 ? (
        <section className="space-y-3">
          <SectionHeader
            title="Demandes récentes"
            action={
              <Link href="/client/demandes" className="text-sm font-medium text-primary hover:underline">
                Tout voir
              </Link>
            }
          />
          <div className="space-y-3">
            {recent.map((d) => (
              <Link key={d.id} href={`/client/demandes/${d.id}`} className="block">
                <DemandeCard demande={d} />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function QuickStat({
  icon,
  label,
  value,
  href,
}: {
  icon: 'clock' | 'check-circle';
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon name={icon} />
          </span>
          <div className="min-w-0">
            <p className="text-xl font-bold leading-none">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}