import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { PublicHeader } from '@/components/public/public-header';
import { PublicFooter } from '@/components/public/public-footer';

export const metadata: Metadata = {
  title: 'Devenir technicien',
};

const steps: Array<{ icon: IconName; title: string }> = [
  { icon: 'user', title: 'Créez votre compte' },
  { icon: 'file', title: 'Complétez votre profil professionnel' },
  { icon: 'shield-check', title: 'Faites vérifier votre identité' },
  {
    icon: 'pin',
    title: 'Recevez des demandes correspondant à votre zone et vos compétences',
  },
  { icon: 'chat', title: 'Échangez avec le client' },
  { icon: 'search', title: 'Établissez votre diagnostic' },
  { icon: 'badge-check', title: 'Proposez votre tarif' },
  { icon: 'wrench', title: 'Réalisez l\u2019intervention' },
];

const benefits: Array<{ icon: IconName; title: string; text: string }> = [
  {
    icon: 'pin',
    title: 'Des demandes près de chez vous',
    text: 'Vous recevez les demandes correspondant à votre ville d\u2019intervention et à vos compétences.',
  },
  {
    icon: 'badge-check',
    title: 'Vous proposez votre tarif',
    text: 'C\u2019est vous qui établissez le diagnostic et le tarif avant toute intervention.',
  },
  {
    icon: 'users',
    title: 'Un échange direct avec le client',
    text: 'Discutez avec le client avant de vous engager, via la messagerie de la mission.',
  },
  {
    icon: 'star',
    title: 'Votre réputation s\u2019affiche',
    text: 'Clients et techniciens s\u2019évaluent après chaque mission.',
  },
];

const requirements: Array<{ icon: IconName; label: string }> = [
  { icon: 'user', label: 'Un compte technicien' },
  { icon: 'file', label: 'Un profil professionnel complet (zone et compétences)' },
  { icon: 'phone', label: 'Vos informations professionnelles (téléphone, ville, catégories)' },
  { icon: 'shield-check', label: 'Une vérification d\u2019identité (KYC) par l\u2019équipe RepairDom' },
];

const framework: Array<{ icon: IconName; label: string }> = [
  { icon: 'shield-check', label: 'Techniciens vérifiés' },
  { icon: 'search', label: 'Diagnostic clair' },
  { icon: 'badge-check', label: 'Tarif avant intervention' },
  { icon: 'clock', label: 'Suivi de mission' },
  { icon: 'file', label: 'Historique des interventions' },
];

export default function DevenirTechnicienPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
        {/* HERO */}
        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to p-6 sm:p-8">
          <div className="flex h-full flex-col items-start gap-4 text-white">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              <Icon name="briefcase" size="sm" />
              Espace professionnel
            </span>
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-balance sm:text-3xl">
              Devenez technicien RepairDom
            </h1>
            <p className="text-base leading-relaxed text-white/85">
              Rejoignez la plateforme qui met en relation les clients ayant besoin d&apos;un
              dépannage avec des techniciens qualifiés près de chez eux.
            </p>
            <div className="mt-1 flex w-full flex-col gap-2 sm:flex-row">
              <Link href="/technicien/inscription" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full bg-white text-brand-gradient-from hover:opacity-90 sm:w-auto"
                >
                  Devenir technicien
                </Button>
              </Link>
            </div>
            <p className="flex items-center gap-1.5 text-sm text-white/80">
              <Icon name="check-circle" size="sm" className="text-white/80" />
              Déjà technicien ?{' '}
              <Link href="/technicien/connexion" className="font-medium text-white underline underline-offset-4">
                Se connecter
              </Link>
            </p>
          </div>
        </section>

        {/* COMMENT ÇA FONCTIONNE */}
        <section className="mt-12" aria-labelledby="how-title">
          <h2 id="how-title" className="text-xl font-bold tracking-tight sm:text-2xl">
            Comment ça fonctionne ?
          </h2>
          <ol className="mt-5 space-y-0">
            {steps.map((step, index) => (
              <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
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
                  <p className="text-xs font-bold text-primary">Étape {index + 1}</p>
                  <p className="font-medium">{step.title}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* POURQUOI REJOINDRE */}
        <section className="mt-12" aria-labelledby="benefits-title">
          <h2 id="benefits-title" className="text-xl font-bold tracking-tight sm:text-2xl">
            Pourquoi rejoindre RepairDom ?
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {benefits.map((item) => (
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

        {/* CE QU'IL FAUT POUR COMMENCER */}
        <section className="mt-12" aria-labelledby="requirements-title">
          <h2 id="requirements-title" className="text-xl font-bold tracking-tight sm:text-2xl">
            Ce qu&apos;il faut pour commencer
          </h2>
          <ul className="mt-5 space-y-3">
            {requirements.map((item) => (
              <li key={item.label} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-card">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon name={item.icon} size="sm" />
                </span>
                <p className="pt-1 text-sm">{item.label}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            Une fois votre compte créé, votre dossier est revu par l&apos;équipe RepairDom avant que
            vous receviez vos premières demandes.
          </p>
        </section>

        {/* UN FONCTIONNEMENT ENCADRÉ */}
        <section className="mt-12" aria-labelledby="framework-title">
          <h2 id="framework-title" className="text-xl font-bold tracking-tight sm:text-2xl">
            Un fonctionnement encadré
          </h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {framework.map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                <Icon name={item.icon} size="sm" className="text-primary" />
                {item.label}
              </span>
            ))}
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="mt-12 overflow-hidden rounded-2xl border border-border bg-card p-6 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon name="sparkles" size="lg" />
          </span>
          <h2 className="mt-3 text-lg font-bold tracking-tight">Prêt à rejoindre RepairDom ?</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Créez votre compte technicien et commencez votre profil dès maintenant.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Link href="/technicien/inscription">
              <Button size="lg" className="w-full">
                Devenir technicien
              </Button>
            </Link>
            <Link href="/technicien/connexion">
              <Button variant="secondary" className="w-full">
                Déjà technicien ? Se connecter
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}