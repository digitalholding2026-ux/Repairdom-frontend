'use client';

import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Switch } from '@/components/ui/switch';
import { DemandeStatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/cn';
import { formatRelative, fullName } from '@/lib/format';
import type { ActivityItem } from '@/components/client/dashboard/activity-feed';
import type { TechnicianDemande, TechnicianProfile } from '@/lib/api/technician-service';

/* Coque carte dark slate glassmorphism partagée du dashboard technicien. */
function TechCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-slate-900/70 p-4 backdrop-blur-md sm:p-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon, title, action }: { icon: IconName; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
        <Icon name={icon} size="sm" className="text-orange-400" />
        {title}
      </h2>
      {action}
    </div>
  );
}

/* ── A. Bloc Statut & Disponibilité ─────────────────────────────── */
export function TechStatusCard({
  isAvailable,
  busy,
  error,
  zone,
  onToggle,
}: {
  isAvailable: boolean;
  busy: boolean;
  error: string | null;
  zone: string;
  onToggle: () => void;
}) {
  return (
    <TechCard
      className={cn(
        'transform-gpu',
        isAvailable
          ? 'border-emerald-500/30 bg-emerald-500/15'
          : 'border-white/10 bg-slate-900/70',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              'text-xs font-medium uppercase tracking-wider',
              isAvailable ? 'text-emerald-300' : 'text-slate-400',
            )}
          >
            Ma disponibilité
          </p>
          <p className="mt-1.5 flex items-center gap-2 text-xl font-bold tracking-tight text-white">
            <span className="relative flex size-2.5 shrink-0" aria-hidden>
              {isAvailable ? (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              ) : null}
              <span
                className={cn(
                  'relative inline-flex size-2.5 rounded-full',
                  isAvailable ? 'bg-emerald-400' : 'bg-slate-500',
                )}
              />
            </span>
            {isAvailable ? 'En ligne' : 'Hors ligne'}
          </p>
          <p className={cn('mt-1 text-xs leading-relaxed', isAvailable ? 'text-emerald-200/90' : 'text-slate-400')}>
            {isAvailable
              ? `Vous êtes en ligne - Prêt à recevoir des missions dans votre zone (${zone})`
              : `Passez en ligne pour recevoir des missions dans votre zone (${zone}).`}
          </p>
        </div>
        <Switch
          checked={isAvailable}
          onCheckedChange={onToggle}
          disabled={busy}
          aria-label={isAvailable ? 'Passer hors ligne' : 'Me mettre en ligne'}
          className="mt-1"
        />
      </div>
      {error ? (
        <p role="alert" className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      ) : null}
    </TechCard>
  );
}

/* ── B. Carte KPI ───────────────────────────────────────────────── */
export function TechKpiCard({
  icon,
  label,
  value,
  sub,
  href,
  accent = 'orange',
}: {
  icon: IconName;
  label: string;
  value: string;
  sub: string;
  href?: string;
  accent?: 'orange' | 'emerald' | 'amber';
}) {
  const chip =
    accent === 'emerald'
      ? 'bg-emerald-500/15 text-emerald-300'
      : accent === 'amber'
        ? 'bg-amber-500/15 text-amber-300'
        : 'bg-orange-500/15 text-orange-300';
  const body = (
    <TechCard className="h-full transform-gpu transition-colors hover:border-white/20">
      <span className={cn('flex size-10 items-center justify-center rounded-xl', chip)}>
        <Icon name={icon} size="md" />
      </span>
      <p className="mt-3 truncate text-2xl font-bold tracking-tight text-white">{value}</p>
      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 truncate text-xs text-slate-500">{sub}</p>
    </TechCard>
  );
  return href ? (
    <Link href={href} className="block h-full transition-transform active:scale-[0.99]">
      {body}
    </Link>
  ) : (
    body
  );
}

/* ── C. Radar Live : missions à proximité ───────────────────────── */
export function TechMissionRow({ demande }: { demande: TechnicianDemande }) {
  return (
    <Link
      href={`/technicien/demandes/${demande.id}`}
      className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 transition-colors hover:border-orange-500/30 hover:bg-white/10"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-300">
        <Icon name="wrench" size="sm" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-white">
          {demande.categoryLabel}
        </span>
        <span className="block truncate text-xs text-slate-400">
          {demande.reference} · {demande.city}
        </span>
      </span>
      <DemandeStatusBadge status={demande.status} context="technician" />
    </Link>
  );
}

export function TechRadarCard({
  zone,
  missions,
  total,
  refreshing,
  onRefresh,
}: {
  zone: string;
  missions: TechnicianDemande[];
  total: number;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <div>
      <SectionTitle
        icon="zap"
        title={`Missions à proximité (Radar Live) · ${zone}`}
        action={
          <Badge variant={total > 0 ? 'info' : 'neutral'} className="shrink-0">
            {total} en attente
          </Badge>
        }
      />
      <TechCard>
        {total === 0 ? (
          <div className="flex flex-col items-start gap-3">
            <p className="flex items-center gap-2 text-sm leading-relaxed text-slate-300">
              <span className="relative flex size-2 shrink-0" aria-hidden>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-slate-400 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-slate-400" />
              </span>
              Aucune mission en attente dans {zone} pour le moment. Nous vous notifierons dès
              qu&apos;un client dépose une demande.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={onRefresh}
              isLoading={refreshing}
              className="border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700"
            >
              Recharger les missions
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {missions.map((d) => (
              <TechMissionRow key={d.id} demande={d} />
            ))}
            <div className="flex items-center justify-between gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                isLoading={refreshing}
                className="text-slate-300 hover:bg-white/10 hover:text-white"
              >
                Recharger
              </Button>
              <Link
                href="/technicien/demandes"
                className="inline-flex items-center gap-1 text-xs font-semibold text-orange-300 hover:text-orange-200"
              >
                Voir les {total} missions
                <Icon name="chevron-right" size="sm" />
              </Link>
            </div>
          </div>
        )}
      </TechCard>
    </div>
  );
}

/* ── D. Activité récente ────────────────────────────────────────── */
const ACTIVITY_TONE: Record<string, string> = {
  primary: 'bg-orange-500/15 text-orange-300',
  info: 'bg-sky-500/15 text-sky-300',
  success: 'bg-emerald-500/15 text-emerald-300',
  warning: 'bg-amber-500/15 text-amber-300',
};

export function TechActivityCard({ items }: { items: ActivityItem[] }) {
  return (
    <div>
      <SectionTitle
        icon="clock"
        title="Activité récente"
        action={
          <Link
            href="/technicien/historique"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-orange-300 hover:text-orange-200"
          >
            Tout voir
            <Icon name="chevron-right" size="sm" />
          </Link>
        }
      />
      <TechCard>
        {items.length === 0 ? (
          <p className="py-2 text-center text-sm text-slate-400">
            Aucune activité pour le moment.
          </p>
        ) : (
          <ol className="divide-y divide-white/5">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href ?? '/technicien/historique'}
                  className="flex items-center gap-3 py-2.5 transition-opacity hover:opacity-90"
                >
                  <span
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-xl',
                      ACTIVITY_TONE[item.tone] ?? ACTIVITY_TONE.info,
                    )}
                  >
                    <Icon name={item.icon} size="sm" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">
                      {item.title}
                    </span>
                    <span className="block truncate text-xs text-slate-400">
                      {item.subtitle}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] text-slate-500">
                    {formatRelative(item.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </TechCard>
    </div>
  );
}

/* ── Compte technicien (profil compact, sans doublon de logo) ───── */
export function TechAccountRow({ profile }: { profile: TechnicianProfile }) {
  const { user } = profile;
  const verified = profile.kycStatus === 'VERIFIED';
  return (
    <div>
      <SectionTitle icon="user" title="Mon compte" />
      <Link href="/technicien/profil" className="block transition-transform active:scale-[0.99]">
        <TechCard className="transition-colors hover:border-white/20">
          <div className="flex items-center gap-3">
            <Avatar
              src={profile.avatarUrl}
              firstName={user.firstName}
              lastName={user.lastName}
              size="lg"
              online={profile.isAvailable}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-white">
                  {fullName(user.firstName, user.lastName)}
                </p>
                <Badge variant={verified ? 'success' : 'warning'} className="shrink-0 gap-0.5">
                  <Icon name={verified ? 'shield-check' : 'alert'} size="3.5" />
                  {verified ? 'Technicien Vérifié' : 'Vérification en cours'}
                </Badge>
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-400">
                {profile.city}
                {profile.specialties.length > 0 ? ` · ${profile.specialties.slice(0, 2).join(', ')}` : ''}
              </p>
            </div>
            <Icon name="chevron-right" size="sm" className="shrink-0 text-slate-500" />
          </div>
        </TechCard>
      </Link>
    </div>
  );
}
