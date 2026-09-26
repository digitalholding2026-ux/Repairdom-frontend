'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/icon';
import { formatDateTime } from '@/lib/format';
import type { MissionEvent } from '@/lib/api/mission-events-service';

/** Détecte un événement de vague de dispatch (type ou libellé, FR/EN).
 * Tolérant : couvre `DISPATCH_WAVE` comme « Vague de dispatch envoyée ». */
export function isDispatchWaveEvent(event: Pick<MissionEvent, 'type' | 'label'>): boolean {
  const type = event.type ?? '';
  const label = event.label ?? '';
  return (
    /dispatch|wave/i.test(type) ||
    /vague.+(dispatch|envoi)|dispatch.+(vague|envoy)|onde.+(dispatch)/i.test(label)
  );
}

/** Partitionne la chronologie : vagues de dispatch agrégées vs reste. */
export function partitionDispatchWaves(events: MissionEvent[]): {
  waves: MissionEvent[];
  rest: MissionEvent[];
} {
  const waves: MissionEvent[] = [];
  const rest: MissionEvent[] = [];
  for (const event of events) {
    if (isDispatchWaveEvent(event)) waves.push(event);
    else rest.push(event);
  }
  return { waves, rest };
}

/* Techniciens notifiés : meilleur effort — certaines vagues annoncent leur
 * portée dans le libellé (« … à 12 techniciens »). Sinon `null` (affiché « — »,
 * jamais inventé). */
function parseNotifiedCount(waves: MissionEvent[]): number | null {
  let max: number | null = null;
  for (const wave of waves) {
    const match = wave.label.match(/(\d+)\s+technicien/i);
    if (match) {
      const count = Number.parseInt(match[1], 10);
      if (Number.isFinite(count)) max = max == null ? count : Math.max(max, count);
    }
  }
  return max;
}

function formatElapsed(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "moins d'une minute";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')} min`;
  }
  const days = Math.floor(hours / 24);
  return days === 1 ? '1 jour' : `${days} jours`;
}

function waveElapsed(waves: MissionEvent[]): string {
  if (waves.length === 0) return '—';
  const times = waves
    .map((wave) => new Date(wave.createdAt).getTime())
    .filter((time) => Number.isFinite(time));
  if (times.length === 0) return '—';
  return formatElapsed(Math.max(...times) - Math.min(...times));
}

export interface DispatchSonarWidgetProps {
  waves: MissionEvent[];
  /** Recherche toujours active (aucun technicien assigné) → pilule verte. */
  active?: boolean;
  className?: string;
}

/* Hub radar agrégeant N vagues de dispatch : carte sombre, ondes sonar,
 * indicateurs clés et tiroir de logs bruts (compact, scroll interne). */
export function DispatchSonarWidget({ waves, active = false, className }: DispatchSonarWidgetProps) {
  const [open, setOpen] = useState(false);
  if (waves.length === 0) return null;

  const waveCount = waves.length;
  const notified = parseNotifiedCount(waves);
  const elapsed = waveElapsed(waves);
  const logsId = `dispatch-logs-${waves[0]?.id ?? 'all'}`;

  return (
    <div
      className={cn(
        'bg-slate-900 border border-[#F97316]/30 rounded-2xl p-6 shadow-xl relative overflow-hidden',
        className,
      )}
    >
      {/* Ondes radar en arrière-plan */}
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 size-72">
        <span className="absolute inset-6 rounded-full border border-[#F97316]/20" />
        <span className="absolute inset-12 rounded-full border border-[#F97316]/20" />
        {[0, 1, 2].map((ring) => (
          <span
            key={ring}
            className="absolute inset-0 animate-ping rounded-full border border-[#F97316]/30"
            style={{ animationDelay: `${ring}s`, animationDuration: '3s' }}
          />
        ))}
      </div>

      <div className="relative space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F97316]/15 text-[#FB923C]">
            <Icon name="zap" size="md" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-100">Radar dispatch</p>
            <p className="text-xs text-slate-400">Recherche de techniciens dans la zone</p>
          </div>
          {active ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
              Recherche en cours
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300">
              Vagues clôturées
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-white/5 px-2 py-3">
            <p className="text-xl font-bold tabular-nums text-[#FB923C]">{waveCount}</p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Vagues émises
            </p>
          </div>
          <div className="rounded-xl bg-white/5 px-2 py-3">
            <p className="flex items-center justify-center gap-1 text-xl font-bold tabular-nums text-slate-100">
              <Icon name="users" size="sm" className="text-slate-400" />
              {notified ?? '—'}
            </p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Techniciens notifiés
            </p>
          </div>
          <div className="rounded-xl bg-white/5 px-2 py-3">
            <p className="flex items-center justify-center gap-1 text-xl font-bold tabular-nums text-slate-100">
              <Icon name="clock" size="sm" className="text-slate-400" />
              {elapsed}
            </p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Temps écoulé
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-expanded={open}
          aria-controls={logsId}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#FB923C]/70 underline-offset-4 hover:text-[#FB923C] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]"
        >
          <Icon
            name="chevron-down"
            size="sm"
            className={cn('transition-transform', open && 'rotate-180')}
          />
          {open
            ? 'Masquer le détail des vagues'
            : `Consulter le détail des vagues (${waveCount} logs)`}
        </button>

        {open ? (
          <ul
            id={logsId}
            className="max-h-40 space-y-1 overflow-y-auto rounded-xl bg-black/30 p-3 font-mono text-xs text-slate-300"
          >
            {waves.map((wave) => (
              <li key={wave.id} className="flex gap-2">
                <span className="shrink-0 tabular-nums text-slate-500">
                  {formatDateTime(wave.createdAt)}
                </span>
                <span className="min-w-0 break-words">{wave.label}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
