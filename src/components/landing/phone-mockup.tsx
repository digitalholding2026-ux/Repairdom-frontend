'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';

export function PhoneMockup() {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrollY(window.scrollY));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = frameRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    const parallax = Math.max(-48, Math.min(16, -scrollY * 0.06));
    el.style.transform = `perspective(1000px) translateY(${parallax}px) rotateY(${px * 12}deg) rotateX(${-py * 12}deg)`;
  };

  const onPointerLeave = () => {
    const el = frameRef.current;
    if (!el) return;
    el.style.transform = '';
  };

  return (
    <div className="relative mx-auto mt-12 w-fit sm:mt-14" aria-hidden>
      <div className="absolute -inset-8 -z-10 rounded-full bg-primary/30 blur-3xl" />

      <div className="animate-float">
        <div
          ref={frameRef}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          className="w-[15.5rem] rounded-[2.4rem] border border-white/15 bg-card p-2 shadow-pop transition-transform duration-150 ease-out will-change-transform"
        >
          <div className="overflow-hidden rounded-[1.9rem] bg-[#0b1120] text-white">
            <div className="flex items-center justify-between px-4 pt-3.5">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-rose-400/80" />
                <span className="size-2 rounded-full bg-amber-300/80" />
                <span className="size-2 rounded-full bg-emerald-400/80" />
              </div>
              <span className="flex items-center gap-1.5 text-[0.65rem] font-semibold text-white/80">
                <span className="flex size-5 items-center justify-center rounded-md bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to">
                  <Icon name="wrench" size="3.5" strokeWidth={2.2} />
                </span>
                RepairDom
              </span>
              <span className="flex items-center justify-center">
                <Icon name="bell" size="sm" className="text-white/70" />
              </span>
            </div>

            <div className="space-y-3 px-3.5 pb-4 pt-3">
              <div className="rounded-2xl bg-gradient-to-br from-brand-gradient-from via-[#6d28d9] to-brand-gradient-to p-3.5 shadow-lg">
                <p className="text-[0.6rem] font-medium uppercase tracking-wider text-white/70">
                  Solde disponible
                </p>
                <div className="mt-0.5 flex items-end justify-between">
                  <p className="text-xl font-bold tracking-tight">240,00&nbsp;€</p>
                  <span className="flex size-6 items-center justify-center rounded-full bg-white/20">
                    <Icon name="arrow-right" size="3.5" />
                  </span>
                </div>
                <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full w-2/3 rounded-full bg-white/90 [animation:shimmer_2.2s_linear_infinite] bg-[linear-gradient(90deg,transparent,rgba(75,0,130,0.35),transparent)] bg-[length:2rem_100%]" />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-[0.6rem] font-medium uppercase tracking-wider text-white/60">
                    Mission en cours
                  </p>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[0.6rem] font-semibold text-emerald-300">
                    <span className="size-1.5 animate-pulse-dot rounded-full bg-emerald-400" />
                    En route
                  </span>
                </div>
                <p className="mt-1.5 text-xs font-bold">Réparation lave-linge</p>
                <p className="text-[0.65rem] text-white/55">Plomberie · Aujourd\u2019hui à 14h</p>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300" />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-white/15 text-[0.6rem] font-bold">
                    A
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.65rem] font-medium leading-none">Amadou Diallo</p>
                    <p className="mt-0.5 text-[0.6rem] text-white/50">Arrivée ~ 12 min</p>
                  </div>
                  <span className="flex items-center gap-0.5 text-amber-300">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Icon key={i} name="star" size="3.5" filled />
                    ))}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-around rounded-2xl border border-white/10 bg-white/[0.06] py-2">
                <Icon name="home" size="sm" className="text-white/90" />
                <Icon name="chat" size="sm" className="text-white/40" />
                <Icon name="bell" size="sm" className="text-white/40" />
                <Icon name="user" size="sm" className="text-white/40" />
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto -mt-6 flex w-32 justify-between">
          <span className="size-1.5 rounded-full bg-primary/40 shadow-float" />
          <span className="size-1.5 rounded-full bg-primary/40 shadow-float" />
          <span className="size-1.5 rounded-full bg-primary shadow-float" />
          <span className="size-1.5 rounded-full bg-primary/40 shadow-float" />
        </div>
      </div>
    </div>
  );
}