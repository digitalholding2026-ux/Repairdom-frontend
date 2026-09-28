import Link from 'next/link';
import { Icon } from '@/components/ui/icon';

/* Briques de services ultra-compactes : grille 3 colonnes sur mobile,
 * 6 colonnes sur desktop. Chaque brique mène à la création de demande. */

const SERVICES = [
  { label: 'Électricité', emoji: '⚡' },
  { label: 'Plomberie', emoji: '🪠' },
  { label: 'Climatisation', emoji: '❄️' },
  { label: 'Appareils', emoji: '🔌' },
  { label: 'Serrurerie', emoji: '🔑' },
  { label: 'Autre', emoji: '🛠️' },
];

export function ServicesGrid() {
  return (
    <section aria-labelledby="services-title" className="mx-auto w-full max-w-3xl px-4 pt-6">
      <h2 id="services-title" className="text-center text-lg font-extrabold tracking-tight text-slate-900">
        Besoin d&apos;un pro pour quoi ?
      </h2>
      <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-6">
        {SERVICES.map((service) => (
          <Link
            key={service.label}
            href="/client/demande"
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm transition-all hover:border-orange-300 active:scale-95"
          >
            <span aria-hidden className="text-2xl leading-none">
              {service.emoji}
            </span>
            <span className="text-xs font-semibold text-slate-800">{service.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* « Pourquoi Relio ? » condensé en grille 2x2 (4x1 sur desktop). */

const WHY = [
  { emoji: '🛡️', title: 'Techniciens Vérifiés', text: 'Identité contrôlée' },
  { emoji: '📝', title: 'Devis Avant Travaux', text: 'Zéro mauvaise surprise' },
  { emoji: '⏱️', title: 'Rendez-vous Garanti', text: 'Ponctualité assurée' },
  { emoji: '🤝', title: 'Paiement Sécurisé', text: 'SasPay / MoMo' },
];

export function WhyRelio() {
  return (
    <section aria-labelledby="why-title" className="mx-auto w-full max-w-3xl px-4 pt-6">
      <h2 id="why-title" className="text-center text-lg font-extrabold tracking-tight text-slate-900">
        Pourquoi Relio ?
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {WHY.map((item) => (
          <div
            key={item.title}
            className="space-y-1 rounded-2xl border border-slate-200/60 bg-slate-50 p-3.5 text-xs"
          >
            <p aria-hidden className="text-xl leading-none">
              {item.emoji}
            </p>
            <p className="font-bold text-slate-900">{item.title}</p>
            <p className="text-slate-500">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* « Comment ça marche ? » : 3 étapes en ligne horizontale, pastilles
 * numérotées orange. */

const STEPS = [
  { title: 'Décrivez la panne', text: 'Catégorie, lieu et créneau en 2 minutes.' },
  { title: 'Validez le devis', text: 'Prix garanti avant tout travaux.' },
  { title: 'Suivez l\u2019intervention', text: 'Technicien certifié, mission évaluée.' },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="mx-auto w-full max-w-3xl px-4 pt-6">
      <h2 id="how-title" className="text-center text-lg font-extrabold tracking-tight text-slate-900">
        Comment ça marche ?
      </h2>
      <ol className="mt-3 grid grid-cols-3 gap-2.5">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm"
          >
            <span
              aria-hidden
              className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white"
            >
              {index + 1}
            </span>
            <p className="mt-2 text-xs font-bold leading-tight text-slate-900">{step.title}</p>
            <p className="mt-1 hidden text-[11px] leading-tight text-slate-500 sm:block">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* Bannière finale épurée : un seul appel à l'action, liens utiles
 * conservés dans le footer. */

export function CompactCta() {
  return (
    <section aria-labelledby="cta-title" className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="rounded-3xl bg-slate-900 p-5 text-center text-white shadow-lg">
        <h2 id="cta-title" className="text-lg font-extrabold tracking-tight">
          Prêt à être dépanné ?
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-xs text-white/70">
          Déposez votre demande, recevez un devis, validez. Le reste, on s&apos;en occupe.
        </p>
        <Link
          href="/client/inscription"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500/90 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 backdrop-blur-sm transition hover:bg-orange-500 active:scale-[0.99]"
        >
          Commencer maintenant
          <Icon name="arrow-right" size="sm" strokeWidth={2.4} />
        </Link>
      </div>
    </section>
  );
}
