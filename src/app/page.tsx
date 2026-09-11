import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { PublicHeader } from '@/components/public/public-header';
import { PublicFooter } from '@/components/public/public-footer';

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
    text: 'Chaque technicien est vérifié manuellement par RepairDom.',
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
    text: 'Clients et techniciens s\u2019évaluent après chaque mission.',
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to p-6 sm:p-8">
          <div className="flex h-full flex-col items-start gap-4 text-white">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              <Icon name="badge-check" size="sm" />
              Techniciens vérifiés
            </span>
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-balance sm:text-3xl">
              Une panne ? On s&apos;occupe du reste.
            </h1>
            <p className="text-base leading-relaxed text-white/85">
              Un technicien qualifié près de chez vous, un diagnostic clair et un tarif avant
              l&apos;intervention.
            </p>
            <div className="mt-1 flex w-full flex-col gap-2 sm:flex-row">
              <Link href="/client/inscription" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full bg-white text-brand-gradient-from hover:opacity-90 sm:w-auto"
                >
                  J&apos;ai besoin d&apos;un dépannage
                </Button>
              </Link>
            </div>
            <p className="flex items-center gap-2 text-xs text-white/70">
              <Icon name="check-circle" size="sm" className="text-white/80" />
              Diagnostic &bull; Tarif avant intervention &bull; Technicien vérifié
            </p>
          </div>
        </section>

        <section className="mt-12" aria-labelledby="how-title">
          <h2 id="how-title" className="text-xl font-bold tracking-tight sm:text-2xl">
            Comment ça marche ?
          </h2>
          <ol className="mt-5 space-y-0">
            {steps.map((step, index) => (
              <li key={step.title} className="relative flex gap-4 pb-7 last:pb-0">
                {index < steps.length - 1 ? (
                  <span aria-hidden className="absolute left-[19px] top-11 bottom-0 w-px bg-border" />
                ) : null}
                <span
                  aria-hidden
                  className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-secondary text-primary"
                >
                  <Icon name={step.icon} size="md" />
                </span>
                <div className="pt-0.5">
                  <p className="flex items-center gap-2 text-base font-semibold">
                    <span className="text-sm font-bold text-primary">Étape {index + 1}</span>
                  </p>
                  <p className="font-medium">{step.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12" aria-labelledby="trust-title">
          <h2 id="trust-title" className="text-xl font-bold tracking-tight sm:text-2xl">
            Le dépannage en confiance
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {trust.map((item) => (
              <div key={item.title} className="rounded-xl border border-border bg-card p-4 shadow-card">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon name={item.icon} size="md" />
                </span>
                <p className="mt-3 text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 overflow-hidden rounded-2xl border border-border bg-card p-6 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon name="sparkles" size="lg" />
          </span>
          <h2 className="mt-3 text-lg font-bold tracking-tight">Prêt à être dépanné ?</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Déposez votre demande, recevez un devis, validez. Le reste, on s&apos;en occupe.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Link href="/client/inscription">
              <Button size="lg" className="w-full">
                J&apos;ai besoin d&apos;un dépannage
              </Button>
            </Link>
            <Link href="/client/connexion">
              <Button variant="secondary" className="w-full">
                J&apos;ai déjà un compte
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}