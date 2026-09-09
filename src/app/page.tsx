import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { siteConfig } from '@/lib/site-config';
import { REQUEST_CATEGORIES } from '@/lib/data/request-categories';

const steps: Array<{ icon: IconName; title: string; text: string }> = [
  {
    icon: 'pin',
    title: 'Décrivez votre panne',
    text: 'Choisissez une catégorie et indiquez où et quand se déroule l’intervention.',
  },
  {
    icon: 'users',
    title: 'Un technicien proche répond',
    text: 'Seuls les techniciens disponibles et adaptés reçoivent votre demande.',
  },
  {
    icon: 'file',
    title: 'Un devis clair avant tout',
    text: 'Vous validez le prix et le rendez-vous avant le début de l’intervention.',
  },
  {
    icon: 'truck',
    title: 'Intervention au rendez-vous',
    text: 'Suivez votre mission pas à pas, du début jusqu’à la fin.',
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
    text: 'L’intervention se déroule à l’heure convenue avec le technicien.',
  },
  {
    icon: 'star',
    title: 'Avis des deux côtés',
    text: 'Clients et techniciens s’évaluent après chaque mission.',
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur safe-top">
        <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between gap-3 px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Icon name="wrench" size="sm" strokeWidth={2.2} />
            </span>
            <span className="text-base font-bold tracking-tight">{siteConfig.name}</span>
          </Link>
          <nav className="flex items-center gap-2" aria-label="Navigation">
            <Link href="/client/connexion">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                Connexion
              </Button>
            </Link>
            <Link href="/technicien/inscription">
              <Button size="sm">Je suis technicien</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to p-6 sm:p-8">
          <div className="flex h-full flex-col items-start gap-4 text-white">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              <Icon name="badge-check" size="sm" />
              Techniciens vérifiés
            </span>
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-balance sm:text-3xl">
              Une panne ? Trouvez le bon technicien près de chez vous.
            </h1>
            <p className="text-base leading-relaxed text-white/85">
              {siteConfig.description}
            </p>
            <div className="mt-1 flex w-full flex-col gap-2 sm:flex-row">
              <Link href="/client/inscription" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full bg-white text-brand-gradient-from hover:opacity-90 sm:w-auto"
                >
                  Trouver un technicien
                </Button>
              </Link>
              <Link href="/technicien/inscription" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-white/40 bg-transparent text-white hover:bg-white/10 sm:w-auto"
                >
                  Proposer mes services
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="categories-title">
          <h2 id="categories-title" className="text-sm font-medium text-muted-foreground">
            Dépannages disponibles
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {REQUEST_CATEGORIES.slice(0, 4).map((category) => (
              <span
                key={category.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium"
              >
                <Icon name="wrench" size="sm" className="text-primary" />
                {category.label}
              </span>
            ))}
            <Link href="/client/inscription" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-primary hover:bg-muted">
              <Icon name="plus" size="sm" />
              Autre besoin…
            </Link>
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
            Déposez votre demande, recevez un devis, validez. Le reste, on s’en occupe.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Link href="/client/inscription">
              <Button size="lg" className="w-full">
                Déposer une demande
              </Button>
            </Link>
            <Link href="/client/connexion">
              <Button variant="secondary" className="w-full">
                J’ai déjà un compte
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground safe-bottom">
        <p>
          © {new Date().getFullYear()} {siteConfig.name}. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}