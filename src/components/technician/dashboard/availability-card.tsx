'use client';

import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Icon } from '@/components/ui/icon';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/cn';

export interface AvailabilityCardProps {
  isAvailable: boolean;
  busy: boolean;
  error: string | null;
  onToggle: () => void;
}

/** Carte « live » de disponibilité — miroir du pôle finance client (BalanceCard). */
export function AvailabilityCard({ isAvailable, busy, error, onToggle }: AvailabilityCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl p-5 text-white shadow-pop',
        'bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600',
        !isAvailable && 'from-zinc-600 via-slate-600 to-slate-700',
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-14 size-40 rounded-full bg-white/20 blur-2xl"
      />
      <div
        aria-hidden
        className="animate-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent"
      />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/40" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-white/70">
            Ma disponibilité
          </p>
          <p className="mt-1.5 flex items-center gap-2 text-2xl font-bold tracking-tight">
            <span className="relative flex size-2.5 shrink-0">
              {isAvailable ? (
                <span className="absolute inline-flex size-full rounded-full bg-emerald-300 opacity-75 animate-ping" />
              ) : null}
              <span
                className={cn(
                  'relative inline-flex size-2.5 rounded-full',
                  isAvailable ? 'bg-emerald-300' : 'bg-white/70',
                )}
              />
            </span>
            {isAvailable ? 'Disponible' : 'Indisponible'}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/70">
            <Icon name="shield-check" size="3.5" />
            {isAvailable
              ? 'Les demandes de votre zone vous sont proposées en priorité.'
              : 'Activez votre disponibilité pour recevoir de nouvelles demandes.'}
          </p>
        </div>
        <Switch
          checked={isAvailable}
          onCheckedChange={onToggle}
          disabled={busy}
          aria-label={isAvailable ? 'Passer indisponible' : 'Me rendre disponible'}
        />
      </div>

      <div className="relative mt-5 flex gap-2.5">
        <Link
          href="/technicien/profil"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/15 py-2.5 text-sm font-medium backdrop-blur-sm transition-transform active:scale-[0.98]"
        >
          <Icon name="settings" size="sm" />
          Réglages
        </Link>
        <Link
          href="/technicien/historique"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/15 py-2.5 text-sm font-medium backdrop-blur-sm transition-transform active:scale-[0.98]"
        >
          <Icon name="clock" size="sm" />
          Historique
        </Link>
      </div>

      {error ? (
        <Alert variant="error" dense className="relative mt-3">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}