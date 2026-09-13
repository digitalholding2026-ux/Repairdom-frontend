import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { PhoneMockup } from './phone-mockup';

const LINE_A = ['Une', 'panne', '?'];
const LINE_B = ['On', "s'occupe", 'du', 'reste.'];

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
          {index < words.length - 1 ? '\u00A0' : ''}
        </span>
      ))}
    </span>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="hero-gradient absolute inset-0" aria-hidden />
      <div className="hero-grid absolute inset-0" aria-hidden />
      <div aria-hidden className="animate-float absolute -right-20 -top-24 size-72 rounded-full bg-white/15 blur-3xl" />
      <div
        aria-hidden
        className="animate-float absolute -bottom-36 -left-24 size-80 rounded-full bg-accent/30 blur-3xl [animation-delay:3s]"
      />

      <div className="relative mx-auto w-full max-w-lg px-4 pb-16 pt-10 sm:pb-20">
        <div className="flex flex-col items-start gap-5 text-white">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white shadow-float backdrop-blur-sm">
            <span className="flex items-center gap-0.5 text-amber-300">
              {Array.from({ length: 5 }).map((_, i) => (
                <Icon key={i} name="star" size="3.5" filled />
              ))}
            </span>
            <span className="opacity-90">100% techniciens vérifiés</span>
            <span className="flex items-center gap-1 text-white/70">
              <Icon name="badge-check" size="sm" />
              4,9/5
            </span>
          </span>

          <h1 className="text-balance text-[2.15rem] font-extrabold leading-[1.08] tracking-tight">
            <Words words={LINE_A} />
            <br />
            <Words
              words={LINE_B}
              className="bg-gradient-to-r from-amber-100 via-white to-sky-100 bg-clip-text text-transparent"
            />
          </h1>

          <p className="max-w-sm text-base leading-relaxed text-white/85">
            Un technicien qualifié près de chez vous, un diagnostic clair et un tarif avant
            l&apos;intervention. Déposez votre panne en 2 minutes.
          </p>

          <div className="mt-1 flex w-full flex-col gap-2.5 sm:flex-row sm:items-center">
            <Link href="/client/inscription" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full bg-white font-semibold text-[#4338ca] shadow-pop hover:bg-white/90 active:scale-[0.98] sm:w-auto"
              >
                J&apos;ai besoin d&apos;un dépannage
                <Icon name="arrow-right" size="sm" />
              </Button>
            </Link>
            <Link href="/devenir-technicien" className="w-full sm:w-auto">
              <Button
                variant="ghost"
                size="lg"
                className="w-full border border-white/25 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 sm:w-auto"
              >
                Devenir technicien
              </Button>
            </Link>
          </div>

          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/75">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="check-circle" size="sm" className="text-white/90" />
              Diagnostic
            </span>
            <span aria-hidden className="size-0.5 rounded-full bg-white/60" />
            <span className="inline-flex items-center gap-1.5">
              <Icon name="check-circle" size="sm" className="text-white/90" />
              Tarif avant intervention
            </span>
            <span aria-hidden className="size-0.5 rounded-full bg-white/60" />
            <span className="inline-flex items-center gap-1.5">
              <Icon name="check-circle" size="sm" className="text-white/90" />
              Suivi en direct
            </span>
          </p>
        </div>

        <PhoneMockup />
      </div>
    </section>
  );
}