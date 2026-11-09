'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/icon';

/** Délais seuils (ms) pour le changement de couleur du timer. */
const URGENT_MS = 2 * 60 * 60 * 1000; // < 2h : rouge
const WARNING_MS = 12 * 60 * 60 * 1000; // < 12h : orange

interface EscrowCountdownProps {
  /** Heure de fin du séquestre (ISO 8601). */
  escrowEndsAt: string;
}

export default function EscrowCountdown({ escrowEndsAt }: EscrowCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const end = new Date(escrowEndsAt).getTime();
    const tick = () => {
      setTimeLeft(Math.max(0, end - Date.now()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [escrowEndsAt]);

  if (timeLeft <= 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-destructive bg-destructive/10 p-3 text-sm font-semibold text-destructive">
        <Icon name="bell" size="sm" />
        Temps écoulé — Remboursement en cours
      </div>
    );
  }

  const h = Math.floor(timeLeft / 3600000);
  const m = Math.floor((timeLeft % 3600000) / 60000);
  const s = Math.floor((timeLeft % 60000) / 1000);

  const isUrgent = timeLeft < URGENT_MS;
  const isWarning = timeLeft < WARNING_MS;

  const variant = isUrgent
    ? 'text-destructive'
    : isWarning
      ? 'text-warning-ink'
      : 'text-muted-foreground';
  const iconName = isUrgent ? 'bell' : isWarning ? 'alert' : null;
  const urgentLabel = isUrgent ? 'Dernière chance !' : null;

  return (
    <div className="flex items-center gap-2 rounded-xl border p-3 text-sm">
      {iconName && <Icon name={iconName} size="sm" className={variant} />}
      <span className={`font-mono tabular-nums font-bold ${variant}`}>
        {h}h {String(m).padStart(2, '0')}m {String(s).padStart(2, '0')}s
      </span>
      {urgentLabel && (
        <span className={`font-semibold ${variant}`}>{urgentLabel}</span>
      )}
    </div>
  );
}
