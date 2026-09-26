import Image from 'next/image';
import { Icon } from '@/components/ui/icon';
import { HeroActions } from './hero-actions';

const TITLE_A = ['Votre', 'panne,'];
const TITLE_B = ['notre', 'priorité.'];

const QUICK_STEPS = [
  'Déposez',
  'Technicien qualifié',
  'Diagnostic',
  'Intervention rapide',
];

function Words({ words, className }: { words: string[]; className?: string }) {
  return (
    <span className={className}>
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          className="word-reveal inline-block"
          style={{ animationDelay: `${180 + index * 110}ms` }}
        >
          {word}
          {index < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#0B0D12]">
      <div className="hero-grid absolute inset-0" aria-hidden />
      <div aria-hidden className="animate-float absolute -right-20 -top-24 size-72 rounded-full bg-[#F97316]/20 blur-3xl" />
      <div
        aria-hidden
        className="animate-float absolute -bottom-36 -left-24 size-80 rounded-full bg-[#FB923C]/10 blur-3xl [animation-delay:3s]"
      />

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 sm:pb-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12 lg:px-8 lg:py-20">
        <div className="flex flex-col items-start gap-5 text-white lg:gap-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white shadow-float backdrop-blur-md">
            <span className="flex items-center gap-0.5 text-amber-300">
              {Array.from({ length: 5 }).map((_, i) => (
                <Icon key={i} name="star" size="3.5" filled />
              ))}
            </span>
            <span className="opacity-90">4,9/5 - Techniciens vérifiés</span>
            <span className="flex items-center gap-1 text-white/70">
              <Icon name="badge-check" size="sm" />
            </span>
          </span>

          <h1 className="text-balance text-[2.15rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            <Words words={TITLE_A} />
            <br />
            <Words
              words={TITLE_B}
              className="bg-gradient-to-r from-[#FB923C] via-white to-[#FB923C] bg-clip-text text-transparent"
            />
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
            Déposez votre demande, trouvez un technicien qualifié près de chez vous et obtenez
            une intervention rapide.
          </p>

          <HeroActions />

          <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-white/75">
            {QUICK_STEPS.map((step, index) => (
              <li key={step} className="inline-flex items-center gap-3">
                {index > 0 ? (
                  <span aria-hidden className="size-0.5 rounded-full bg-white/60" />
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="check-circle" size="sm" className="text-white/90" />
                  {step}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 shadow-2xl h-[480px] lg:h-[580px]">
          <Image
            src="/hero/hero_main.png"
            alt="Relio Dépannage — un client suit son technicien en route depuis son téléphone"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover object-center"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent"
          />
          <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-3 shadow-float backdrop-blur-md sm:right-auto">
            <span className="relative flex size-2.5 shrink-0">
              <span className="animate-pulse-dot absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
              <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
            </span>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#F97316] text-white shadow-md shadow-[#F97316]/20">
              <Icon name="truck" size="md" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-white">Technicien en route</span>
              <span className="block truncate text-xs text-white/75">
                Suivi en direct de votre intervention
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
