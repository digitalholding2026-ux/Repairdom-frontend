import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { formatRequestedTiming } from '@/lib/request-timing';
import { formatDate } from '@/lib/format';
import { STATUS_PROGRESS } from '@/lib/mission-progress';

/* Phase B — carte mission unifiée (listes + historique, client + technicien).
 * Remplace les 4 composants miroirs (~280 lignes dupliquées) :
 * DemandeCard / HistoryDemandeCard / TechnicianDemandeCard /
 * TechnicianHistoryDemandeCard deviennent de fins adaptateurs qui fournissent
 * le badge (contexte), le lien et le pied (personne + montant). */

export interface MissionCardPart {
  name?: string | null;
}

export function deviceLabelFor(demande: {
  domain?: MissionCardPart | null;
  brand?: MissionCardPart | null;
  model?: MissionCardPart | null;
  problem?: MissionCardPart | null;
}): string {
  return [demande.domain?.name, demande.brand?.name, demande.model?.name, demande.problem?.name]
    .filter(Boolean)
    .join(' — ');
}

export interface MissionCardProps {
  reference: string;
  /** Badge de statut rendu par l'appelant (le contexte diffère : client, technicien, historique). */
  badge: ReactNode;
  categoryLabel: string;
  deviceLabel?: string;
  description?: string | null;
  city?: string | null;
  createdAt: string;
  requestedMode?: string | null;
  requestedAt?: string | null;
  /** Les cartes d'historique n'affichent pas la ligne planifié/dès que possible. */
  showTiming?: boolean;
  /** Enveloppe la carte dans un lien quand fourni (cas technicien). */
  href?: string;
  /** Pied personne + montant (technicien assigné côté client, client côté technicien). */
  footer?: ReactNode;
}

export function MissionCard({
  reference,
  badge,
  categoryLabel,
  deviceLabel,
  description,
  city,
  createdAt,
  requestedMode,
  requestedAt,
  showTiming = true,
  href,
  footer,
}: MissionCardProps) {
  const scheduled = requestedMode === 'SCHEDULED';
  const content = (
    <Card className="transition-colors hover:border-primary/40 hover:bg-muted/50">
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-sm font-semibold text-primary">{reference}</span>
          {badge}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon name="wrench" size="sm" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{categoryLabel}</p>
            {deviceLabel ? (
              <p className="truncate text-xs text-muted-foreground">{deviceLabel}</p>
            ) : null}
          </div>
        </div>

        {description ? (
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{description}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Icon name="pin" size="3.5" />
            {city}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="calendar" size="3.5" />
            {formatDate(createdAt)}
          </span>
          {showTiming ? (
            <span className="inline-flex items-center gap-1">
              <Icon name={scheduled ? 'calendar' : 'clock'} size="3.5" />
              {scheduled
                ? formatRequestedTiming(requestedMode ?? null, requestedAt ?? null)
                : 'Intervention dès que possible'}
            </span>
          ) : null}
        </div>

        {footer}
      </div>
    </Card>
  );
  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}

/* Pied personne + montant final (technicien assigné ou client + réputation). */
export function MissionCardPerson({
  name,
  amount,
  extra,
}: {
  name: string;
  amount: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-3.5 py-2.5">
      <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon name="user" size="3.5" />
        </span>
        <span className="truncate font-medium text-foreground">{name}</span>
        {extra}
      </span>
      <span className="shrink-0 font-mono text-sm font-semibold text-foreground">{amount}</span>
    </div>
  );
}

/* Carte « mission en cours » (gradient + progression + personne).
 * Unifie LiveMissionCard (client) et TechnicianLiveMissionCard, identiques
 * à 5 lignes près : seul le badge, le lien et le bloc personne diffèrent. */
export interface LiveMissionCardProps {
  href: string;
  badge: ReactNode;
  categoryLabel: string;
  reference: string;
  description?: string | null;
  status: string;
  requestedMode: string | null;
  requestedAt: string | null;
  personAvatar: ReactNode;
  personName: string;
  personSub: string;
}

export function LiveMissionCard({
  href,
  badge,
  categoryLabel,
  reference,
  description,
  status,
  requestedMode,
  requestedAt,
  personAvatar,
  personName,
  personSub,
}: LiveMissionCardProps) {
  const progress = STATUS_PROGRESS[status] ?? 15;
  return (
    <Link href={href} className="block active:scale-[0.99] transition-transform">
      <div className="rounded-2xl bg-gradient-to-br from-primary/35 via-primary/20 to-accent/35 p-px">
        <div className="relative overflow-hidden rounded-[calc(1rem-1px)] bg-card p-4 shadow-float">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="flex size-2 rounded-full bg-success">
                <span className="animate-pulse-dot size-full rounded-full bg-success ring-2 ring-success/40" />
              </span>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mission en cours
              </p>
            </div>
            {badge}
          </div>

          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-bold tracking-tight">{categoryLabel}</p>
              <p className="mt-0.5 font-mono text-xs font-semibold text-primary">{reference}</p>
            </div>
          </div>

          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{description}</p>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Icon name="clock" size="3.5" />
                {formatRequestedTiming(requestedMode, requestedAt)}
              </span>
              <span className="text-xs font-medium text-foreground">{Math.round(progress)}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="animate-stripes h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-1000"
                style={{
                  width: `${progress}%`,
                  backgroundImage:
                    'repeating-linear-gradient(45deg, rgb(255 255 255 / 0.22) 0 6px, transparent 6px 12px)',
                }}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {personAvatar}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{personName}</p>
                <p className="text-xs text-muted-foreground">{personSub}</p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary">
              Suivre
              <Icon name="chevron-right" size="sm" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
