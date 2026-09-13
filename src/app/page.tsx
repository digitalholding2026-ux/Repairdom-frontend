import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { PublicHeader } from '@/components/public/public-header';
import { PublicFooter } from '@/components/public/public-footer';
import { Hero } from '@/components/landing/hero';
import { CategoryMarquee } from '@/components/landing/category-marquee';
import { TrustStrip } from '@/components/landing/trust-strip';
import { Reveal } from '@/components/landing/reveal';

const steps: Array<{ icon: IconName; title: string; text: string }> = [
  {
    icon: 'pin',
    title: 'Décrivez votre panne',
    text: 'Choisissez une catégorie et indiquez où et quand se déroule l\u2019intervention.',
  },
  {
    icon: 'users',
    title: 'Un technicien proche répond',
    text: 'Seuls les techniciens disponibles et adaptés reçoivent votre demande.',
  },
  {
    icon: 'file',
    title: 'Un devis clair avant tout',
    text: 'Vous validez le prix et le rendez-vous avant le début de l\u2019intervention.',
  },
  {
    icon: 'truck',
    title: 'Intervention au rendez-vous',
    text: 'Suivez votre mission pas à pas, du début jusqu\u2019à la fin.',
  },
  {
    icon: 'star',
    title: 'Évaluez en toute confiance',
    text: 'Chaque intervention est évaluée par le client et le technicien.',
  },
];

const trust: Array<{ icon: IconName; title: string; text: string }> = [
  {
    icon: 'badge-check',
    title: 'Identité vérifiée',
    text: 'Chaque technicien est vérifié manuellement par RepairDom avant de rejoindre la plateforme.',
  },
  {
    icon: 'file',
    title: 'Devis avant intervention',
    text: 'Aucune surprise : vous acceptez le devis avant le début des travaux.',
  },
  {
    icon: 'clock',
    title: 'Rendez-vous planifié',
    text: 'L\u2019intervention se déroule à l\u2019heure convenue avec le technicien.',
  },
  {
    icon: 'star',
    title: 'Avis des deux côtés',
    text: 'Clients et techniciens s\u2019évaluent après chaque mission pour construire la confiance.',
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main className="flex-1">
        <Hero />

        <div className="mx-auto w-full max-w-lg px-4 pb-16">
          <CategoryMarquee />
          <TrustStrip />

          <section className="mt-14" aria-labelledby="how-title">
            <Reveal>
              <p className="px-1 text-xs font-semibold uppercase tracking-wider text-primary">
                Le parcours
              </p>
              <h2 id="how-title" className="mt-1 px-1 text-xl font-bold tracking-tight sm:text-2xl">
                Comment ça marche ?
              </h2>
            </Reveal>
            <ol className="mt-6 space-y-0">
              {steps.map((step, index) => (
                <li key={step.title} className="relative flex gap-4 pb-7 last:pb-0">
                  {index < steps.length - 1 ? (
                    <Reveal
                      delay={index * 60}
                      className="absolute left-[19px] top-11 bottom-0 w-px bg-border"
                    />
                  ) : null}
                  <Reveal delay={index * 60} className="relative z-10">
                    <span
                      aria-hidden
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-gradient-to-br from-secondary to-secondary/60 text-primary shadow-float"
                    >
                      <Icon name={step.icon} size="md" />
                    </span>
                  </Reveal>
                  <Reveal delay={index * 80} className="pt-0.5">
                    <p className="flex items-center gap-2 text-base font-semibold">
                      <span className="text-sm font-bold text-primary">Étape {index + 1}</span>
                    </p>
                    <p className="font-medium">{step.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{step.text}</p>
                  </Reveal>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-14" aria-labelledby="trust-title">
            <Reveal>
              <p className="px-1 text-xs font-semibold uppercase tracking-wider text-primary">
                Pourquoi RepairDom
              </p>
              <h2 id="trust-title" className="mt-1 px-1 text-xl font-bold tracking-tight sm:text-2xl">
                Le dépannage en confiance
              </h2>
            </Reveal>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {trust.map((item, index) => (
                <Reveal key={item.title} delay={index * 70} className="h-full">
                  <div className="h-full rounded-2xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/30">
                    <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon name={item.icon} size="md" />
                    </span>
                    <p className="mt-3 text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          <section
            className="mt-14 overflow-hidden rounded-3xl shadow-float"
            aria-labelledby="cta-title"
          >
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] p-6 text-center text-white">
              <div aria-hidden className="animate-float absolute -right-10 -top-12 size-36 rounded-full bg-white/15 blur-2xl" />
              <div className="relative">
                <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white/15 text-white shadow-float">
                  <Icon name="sparkles" size="lg" />
                </span>
                <h2 id="cta-title" className="mt-4 text-lg font-bold tracking-tight">
                  Prêt à être dépanné ?
                </h2>
                <p className="mx-auto mt-1 max-w-sm text-sm text-white/85">
                  Déposez votre demande, recevez un devis, validez. Le reste, on s&apos;en occupe.
                </p>
                <div className="mt-5 flex flex-col gap-2.5">
                  <Link href="/client/inscription">
                    <Button size="lg" className="w-full bg-white font-semibold text-[#4338ca] shadow-pop hover:bg-white/90">
                      J&apos;ai besoin d&apos;un dépannage
                    </Button>
                  </Link>
                  <Link href="/client/connexion">
                    <Button
                      variant="ghost"
                      size="lg"
                      className="w-full border border-white/25 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
                    >
                      J&apos;ai déjà un compte
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}