'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import { Reveal } from './reveal';

interface Stat {
  icon: IconName;
  value: number;
  decimals?: number;
  suffix: string;
  label: string;
}

const STATS: Stat[] = [
  { icon: 'wrench', value: 5000, suffix: '+', label: 'Interventions réalisées' },
  { icon: 'badge-check', value: 350, suffix: '+', label: 'Techniciens vérifiés' },
  { icon: 'users', value: 12, suffix: '', label: 'Villes desservies' },
  { icon: 'star', value: 4.9, decimals: 1, suffix: '/5', label: 'Note moyenne' },
];

function Counter({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const started = useRef(false);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        const t0 = performance.now();
        const duration = 1200;
        const tick = (now: number) => {
          const p = Math.min((now - t0) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setDisplay(value * eased);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        io.disconnect();
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value]);

  const formatted =
    decimals > 0
      ? display.toFixed(decimals)
      : new Intl.NumberFormat('fr-FR').format(Math.round(display));

  return <span ref={ref}>{formatted}</span>;
}

export function StatsBand() {
  return (
    <section className="mt-14" aria-labelledby="stats-title">
      <p id="stats-title" className="sr-only">
        Relio en chiffres
      </p>
      <div className="grid grid-cols-2 gap-3">
        {STATS.map((stat, index) => (
          <Reveal key={stat.label} delay={index * 80} className="h-full">
            <div className="h-full rounded-2xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/30">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon name={stat.icon} size="md" />
              </span>
              <p className="mt-3 text-2xl font-bold leading-none tracking-tight">
                <Counter value={stat.value} decimals={stat.decimals} />
                <span className="text-base text-primary">{stat.suffix}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}