import Image from 'next/image';
import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/icon';

/* ────────────────────────────────────────────────────────────────────────────
 * Coquille de section commune : même rythme visuel sur toute la landing
 * (padding vertical, titre centré, gouttière, espacement des blocs).
 * ──────────────────────────────────────────────────────────────────────────── */
function Section({
  id,
  children,
  className = '',
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`mx-auto w-full max-w-3xl scroll-mt-20 px-4 py-6 ${className}`}>
      {children}
    </section>
  );
}

function SectionTitle({ id, title, intro }: { id: string; title: string; intro?: string }) {
  return (
    <div className="text-center">
      <h2 id={id} className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
        {title}
      </h2>
      {intro ? <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{intro}</p> : null}
    </div>
  );
}

/* ── 2. Comment ça marche ───────────────────────────────────────────────────
 * Les 4 étapes réelles du tunnel (décrire → technicien → devis → paiement).
 */
const STEPS: { title: string; text: string; icon: IconName }[] = [
  {
    title: 'Décrivez la panne',
    text: 'Appareil, symptôme, ville et créneau en 2 minutes.',
    icon: 'wrench',
  },
  {
    title: 'Technicien assigné',
    text: 'Un professionnel vérifié de votre zone est désigné.',
    icon: 'users',
  },
  {
    title: 'Devis validé',
    text: 'Le prix est affiché avant toute intervention.',
    icon: 'file',
  },
  {
    title: 'Paiement après validation',
    text: 'Vous réglez une fois le travail validé.',
    icon: 'shield-check',
  },
];

export function HowItWorks() {
  return (
    <Section id="how-title">
      <SectionTitle
        id="how-title-heading"
        title="Comment ça marche ?"
        intro="Quatre étapes, aucune mauvaise surprise."
      />
      <ol className="mt-4 grid gap-2.5 sm:grid-cols-2 sm:gap-3">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm"
          >
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-orange-600"
            >
              <Icon name={step.icon} size="sm" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-orange-600 tabular-nums">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-sm font-bold leading-tight text-slate-900">{step.title}</span>
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-500">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* ── 3. Réassurance ──────────────────────────────────────────────────────────
 * Les 4Ranit garanties produit réellement appliquées par le code.
 */
const WHY: { title: string; text: string; icon: IconName }[] = [
  {
    title: 'Techniciens vérifiés',
    text: 'Identité et contrôle KYC validés avant la mise en relation.',
    icon: 'badge-check',
  },
  {
    title: 'Devis avant travaux',
    text: 'Le prix est connu et accepté avant que rien ne commence.',
    icon: 'file',
  },
  {
    title: 'Paiement sécurisé',
    text: 'Vous ne payez qu\'après avoir validé l\'intervention.',
    icon: 'shield',
  },
  {
    title: 'Suivi en temps réel',
    text: 'Une référence unique pour suivre l\'avancement à tout moment.',
    icon: 'pin',
  },
];

export function WhyRelio() {
  return (
    <Section id="why-title">
      <SectionTitle
        id="why-title-heading"
        title="Pourquoi Relio ?"
        intro="Les garanties qui vous protègent à chaque étape."
      />
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2 sm:gap-3">
        {WHY.map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-3 rounded-2xl border border-slate-200/60 bg-slate-50 p-4 text-left"
          >
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-orange-600 shadow-sm"
            >
              <Icon name={item.icon} size="sm" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight text-slate-900">
                {item.title}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-500">{item.text}</span>
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ── 4. Services disponibles ────────────────────────────────────────────────
 * Liste STATIQUE : `GET /catalog/domains` exige un JWT, donc la landing
 * publique ne peut pas l'interroger. Les 6 entrées ci-dessous sont les
 * familles du wizard, à valider côté admin si le catalogue évolue.
 *
 * Pictogrammes émoji conservés : le set `Icon` n'a pas d'équivalent
 * sémantique fiable pour ces 6 familles (pas de clé, de prise, de tuyau…).
 */
const SERVICES: { label: string; emoji: string }[] = [
  { label: 'Électricité', emoji: '⚡' },
  { label: 'Plomberie', emoji: '🪠' },
  { label: 'Climatisation', emoji: '❄️' },
  { label: 'Appareils', emoji: '🔌' },
  { label: 'Serrurerie', emoji: '🔑' },
  { label: 'Autre', emoji: '🛠️' },
];

export function ServicesGrid() {
  return (
    <Section id="services-title">
      <SectionTitle
        id="services-title-heading"
        title="Quel service vous faut ?"
        intro="Choisissez une catégorie pour démarrer votre demande."
      />
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {SERVICES.map((service) => (
          <Link
            key={service.label}
            href='/demande'
            className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm transition-all hover:border-orange-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 active:scale-95"
          >
            <span aria-hidden className="text-2xl leading-none">
              {service.emoji}
            </span>
            <span className="text-xs font-semibold text-slate-800">{service.label}</span>
          </Link>
        ))}
      </div>
    </Section>
  );
}

/* ── 7. Programme de récompenses ────────────────────────────────────────────
 * Paliers repris de `REWARDS_CATALOG` (la source de vérité côté client) :
 * 5 → intervention offerte + pack collector, 12 → fer, 25 → TV, 50 →
 * smartphone, 100 → grand prix. Les visuels proviennent de /public/recompense.
 * Trois paliers seulement sont mis en avant ; « Voir tous les paliers »
 * mène au catalogue complet.
 */
const REWARDS_HIGHLIGHTS: { tier: string; title: string; imageSrc: string }[] = [
  {
    tier: '5 dépannages',
    title: 'Dépannage 100 % offert + pack collector Relio',
    imageSrc: '/recompense/tshirt_cap.png',
  },
  {
    tier: '25 dépannages',
    title: 'Écran TV LED Smart',
    imageSrc: '/recompense/tv.png',
  },
  {
    tier: '50 dépannages',
    title: 'Smartphone moderne',
    imageSrc: '/recompense/smartphone.png',
  },
];

export function Rewards() {
  return (
    <Section id="rewards-title">
      <SectionTitle
        id="rewards-title-heading"
        title="Plus vous êtes fidèle, plus vous gagnez."
        intro="Chaque dépannage confirmé compte. Le 5ᵉ vous offre votre prochaine intervention."
      />
      <div className="mt-4 grid gap-2.5 sm:grid-cols-3 sm:gap-3">
        {REWARDS_HIGHLIGHTS.map((reward) => (
          <div
            key={reward.tier}
            className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
          >
            <div className="relative aspect-[4/3] w-full bg-slate-50">
              <Image
                src={reward.imageSrc}
                alt={reward.title}
                fill
                sizes="(max-width: 639px) 90vw, 30vw"
                className="object-cover"
              />
            </div>
            <div className="p-3.5">
              <p className="text-[11px] font-bold tracking-wide text-orange-600 uppercase">
                {reward.tier}
              </p>
              <p className="mt-1 text-sm font-bold leading-tight text-slate-900">{reward.title}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-center">
        <Link
          href="/client/recompenses"
          className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
        >
          Voir tous les paliers
          <Icon name="arrow-right" size="sm" strokeWidth={2.4} />
        </Link>
      </div>
    </Section>
  );
}

/* ── 8. Devenir technicien ──────────────────────────────────────────────────
 * Bloc volontairement minimal : il redirige vers la page d'inscription
 * technicien existante. Aucun avantage chiffré n'est annoncé ici, ces
 * données n'existent pas dans le code.
 */
export function BecomeTechnician() {
  return (
    <Section id="technicien-title">
      <div className="rounded-3xl border border-slate-200/70 bg-white p-5 text-center shadow-sm sm:p-7">
        <span
          aria-hidden
          className="mx-auto flex size-12 items-center justify-center rounded-full bg-orange-500/10 text-orange-600"
        >
          <Icon name="briefcase" size="md" />
        </span>
        <h2 id="technicien-title-heading" className="mt-3 text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
          Vous êtes technicien ?
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          Rejoignez le réseau Relio et recevez des demandes d&apos;intervention dans votre zone.
        </p>
        <Link
          href="/devenir-technicien"
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 text-sm font-bold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 sm:w-auto"
        >
          Devenir technicien
          <Icon name="arrow-right" size="sm" strokeWidth={2.4} />
        </Link>
      </div>
    </Section>
  );
}

/* ── 9. CTA final ─────────────────────────────────────────────────────────── */
export function CompactCta() {
  return (
    <Section id="cta-title">
      <div className="rounded-3xl bg-slate-900 p-5 text-center text-white shadow-lg sm:p-7">
        <h2 id="cta-title-heading" className="text-lg font-extrabold tracking-tight sm:text-xl">
          Prêt à être dépanné ?
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-white/70">
          Déposez votre demande, recevez un devis, validez. Le reste, on s&apos;en occupe.
        </p>
        <Link
          href='/demande'
          className="brand-gradient mt-5 flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 active:scale-[0.99] sm:text-base"
        >
          Commencer maintenant
          <Icon name="arrow-right" size="sm" strokeWidth={2.4} />
        </Link>
      </div>
    </Section>
  );
}