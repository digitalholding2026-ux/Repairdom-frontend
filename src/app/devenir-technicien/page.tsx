import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { PublicHeader } from '@/components/public/public-header';
import { PublicFooter } from '@/components/public/public-footer';
import {
  TECHNICIAN_FEE_LABEL,
  previewTechnicianQuote,
} from '@/lib/technician-quote';
import { relioAbsorbsTransferFeesNote } from '@/lib/saspay-relio-absorbs-fees';
import { formatFCFA } from '@/lib/format-fcfa';
import { ONBOARDING_STEP_DEFS } from '@/lib/technician/onboarding-steps';
import { RecrutementStats } from './recrutement-stats';

/* ────────────────────────────────────────────────────────────────────────────
 * /devenir-technicien — page de recrutement.
 *
 * Ce qui a changé par rapport à la version précédente (audit RAPPORT-AUDIT-
 * PAGE-DEVENIR-TECHNICIEN.md), et pourquoi :
 *
 * 1. LE PARCOURS AFFICHÉ ÉTAIT FAUX. La page listait huit étapes enchaînées,
 *    dont le contrôle d'identité en troisième position. Le code réel
 *    (`ONBOARDING_STEP_DEFS`) définit quatre étapes, dans un autre ordre, et
 *    aucune n'est bloquante. Cette page affiche désormais les étapes réelles,
 *    avec leur description et leur route — importées, pas recopiées, pour qu'un
 *    changement du parcours se répercute ici.
 *
 * 2. LE PAIEMENT ÉTAIT ABSENT des 8 étapes. C'est la question n° 1 d'un
 *    technicien candidat, et l'information existait déjà dans le dépôt
 *    (`auth-split.tsx`). Il est désormais une section à part entière (étape 4
 *    de la section « Une intervention, concrètement », mise en valeur) et un
 *    argument à part entière.
 *
 * 3. LE BARÈME N'ÉTAIT PAS AFFICHE. Les montants du tableau sont calculés par
 *    `previewTechnicianQuote`, pas écrits en dur : si le barème change côté
 *    serveur, ce tableau suit. Le libellé vient de `TECHNICIAN_FEE_LABEL`.
 *
 * CE QUE CETTE PAGE NE FAIT PAS, VOLONTAIREMENT :
 *   • aucun retour d'expérience quotationné — il n'en existe aucun dans le
 *     produit, et la page d'accueil a déjà retiré les siens pour cette
 *     raison exacte (`app/page.tsx`) ;
 *   • aucun décompte de techniciens, aucune moyenne de gains, aucun délai de
 *     traitement : aucun point d'accès public ne les expose ;
 *   • aucune promesse d'accompagnement, d'encadrement ou de gain garanti.
 *
 * Elle reste un Server Component : le seul fragment client est la section des
 * chiffres, extraite dans `recrutement-stats.tsx` (même approche que
 * `components/landing/trust-stats.tsx`).
 * ──────────────────────────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: 'Devenir technicien',
  /* Le barème n'est pas recopié ici : il vient de la même constante que le
   * tableau de la section 6. Deux littéraux divergeraient au prochain
   * changement de commission. */
  description: `Rejoignez Relio comme technicien vérifié : missions dans vos zones, tarif que vous fixez, paiement après validation. ${TECHNICIAN_FEE_LABEL} par mission, aucun frais caché.`,
};

const SIGNUP_HREF = '/technicien/inscription';
const SIGNIN_HREF = '/technicien/connexion';
const SIGNUP_LABEL = 'Devenir technicien';
const SIGNIN_CTA_LABEL = 'Déjà technicien ? Se connecter';

/** Les 4 étapes métier d'une intervention. Le paiement est isolé : il reçoit
 *  une mise en valeur propre, c'est l'argument décisif du recrutement. */
const MISSION_STEPS: Array<{
  icon: IconName;
  title: string;
  text: string;
  highlighted?: boolean;
}> = [
  {
    icon: 'search',
    title: 'Diagnostic',
    text: 'Vous échangez avec le client et établissez votre diagnostic.',
  },
  {
    icon: 'file',
    title: 'Proposition tarifaire',
    text: 'Vous proposez votre prix. Le client le valide avant l’intervention.',
  },
  {
    icon: 'wrench',
    title: 'Intervention',
    text: 'Vous vous déplacez et réalisez la réparation.',
  },
  {
    icon: 'wallet',
    title: 'Paiement après validation',
    text: 'Vous êtes payé une fois l’intervention validée par le client.',
    highlighted: true,
  },
];

/** Barème : montant du devis → ce que reçoit réellement le technicien. */
const QUOTE_AMOUNTS_XAF = [5_000, 10_000, 15_000, 25_000];

const ARGUMENTS: Array<{ icon: IconName; title: string; text: string }> = [
  {
    icon: 'pin',
    title: 'Des missions près de chez vous',
    text: 'Vous recevez uniquement les demandes de votre ville et de vos zones de couverture.',
  },
  {
    icon: 'badge-check',
    title: 'Vous fixez votre tarif',
    text: 'C’est vous qui établissez le diagnostic et le prix avant chaque intervention.',
  },
  {
    icon: 'shield-check',
    title: 'Paiement garanti après validation',
    text: 'Le client paie avant l’intervention. Vous recevez votre paiement une fois la mission validée, sans relance.',
  },
  {
    icon: 'file',
    title: 'Commission transparente',
    text: `${TECHNICIAN_FEE_LABEL} par mission. Aucun frais caché : vous voyez exactement ce que vous recevez.`,
  },
  {
    icon: 'user',
    title: 'Identité vérifiée une fois',
    text: 'Après vérification, vous intervenez sans autre formalité.',
  },
  {
    icon: 'users',
    title: 'Une communauté sélectionnée',
    text: 'Chaque technicien est vérifié. Vous travaillez avec des professionnels.',
  },
];

const EXPECTATIONS: Array<{ icon: IconName; label: string }> = [
  { icon: 'user', label: 'Un compte technicien — inscription en 2 minutes' },
  { icon: 'file', label: 'Un profil professionnel complet : ville, catégories, expérience' },
  { icon: 'shield-check', label: 'Une pièce d’identité valide (CNI recto-verso ou passeport)' },
  { icon: 'pin', label: 'Au moins une zone de couverture définie' },
];

const COMMITMENTS: Array<{ icon: IconName; title: string; text: string }> = [
  {
    icon: 'chat',
    title: 'Support réactif',
    text: 'Une question, un blocage ? Notre équipe est là.',
  },
  {
    icon: 'briefcase',
    title: 'Outils professionnels',
    text: 'Diagnostic, devis, suivi GPS, historique : tout est dans votre espace.',
  },
  {
    icon: 'check-circle',
    title: 'Missions qualifiées',
    text: 'Clients vérifiés, demandes filtrées par zone et compétences.',
  },
  {
    icon: 'sparkles',
    title: 'Évolution continue',
    text: 'Nouvelles fonctionnalités chaque mois, basées sur vos retours.',
  },
];

/* FAQ technicien. Volontairement distincte de la FAQ client de la landing,
 * qui répond à « Combien coûte une intervention ? » — pas à « Combien je gagne,
 * moi ? ». Aucun délai ni engagement chiffré n'y est annoncé : les seules
 * durées citées sont l'inscription et le profil, qui dépendent du technicien. */
const FAQ = [
  {
    question: 'Combien de temps prend l’inscription ?',
    answer:
      'Inscription en 2 minutes, profil complet en 15 minutes. La vérification d’identité est ensuite traitée par notre équipe.',
  },
  {
    question: 'Quels documents sont nécessaires ?',
    answer:
      'Une CNI recto-verso ou un passeport, et un justificatif professionnel — facultatif, mais recommandé pour rassurer les clients.',
  },
  {
    question: 'Comment suis-je payé ?',
    answer:
      'Après chaque intervention validée par le client, le montant est crédité sur votre solde Relio. Vous pouvez retirer à tout moment.',
  },
  {
    question: 'Quels sont les frais ?',
    answer: `${TECHNICIAN_FEE_LABEL} par mission. ${relioAbsorbsTransferFeesNote('mission')}`,
  },
  {
    question: 'Puis-je choisir mes zones et mes horaires ?',
    answer:
      'Oui. Vous définissez vos zones de couverture et activez votre disponibilité quand vous le souhaitez.',
  },
  {
    question: 'Y a-t-il un engagement minimum ?',
    answer:
      'Non. Vous travaillez quand vous voulez, autant que vous voulez. Aucune obligation de volume.',
  },
];

export default function DevenirTechnicienPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        {/* ── 1. HERO ────────────────────────────────────────────────────── */}
        {/* Fond profond et deux halos discrets : la page s'ouvre sur du calme,
            les accents orange servent d'orientation, pas d'accroche agressive. */}
        <section className="relative isolate overflow-hidden rounded-2xl bg-relio-bg p-6 sm:p-8 lg:p-12">
          <span
            aria-hidden
            className="recruit-halo -top-24 -right-16 -z-10 size-72 opacity-20 sm:size-96"
          />
          <span
            aria-hidden
            className="recruit-halo -bottom-32 -left-24 -z-10 size-80 opacity-15 sm:size-[26rem]"
          />
          <div className="relative flex h-full flex-col items-start gap-4 lg:max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white">
              <Icon name="briefcase" size="sm" />
              Espace professionnel
            </span>
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-balance text-white sm:text-3xl">
              Devenez technicien Relio
            </h1>
            <p className="text-base leading-relaxed text-white/80">
              Nous ne recrutons pas tout le monde. Chaque technicien de Relio est vérifié,
              et chaque mission confiée l&apos;est à un professionnel. Si vous êtes du genre
              à faire un travail propre et à expliquer ce que vous faites, vous aurez votre
              place ici.
            </p>
            <div className="mt-1 flex w-full flex-col gap-2 sm:flex-row">
              <Link href={SIGNUP_HREF} className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full bg-primary text-primary-foreground hover:opacity-90 sm:w-auto"
                >
                  {SIGNUP_LABEL}
                </Button>
              </Link>
              <Link href={SIGNIN_HREF} className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full border-white/20 bg-white/10 text-white hover:bg-white/15 sm:w-auto"
                >
                  {SIGNIN_CTA_LABEL}
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── 2. PREUVES SOCIALES (chiffres réels, masqué si l'appel échoue) ── */}
        <div className="mt-10">
          <RecrutementStats />
        </div>

        {/* ── 3. LE PARCOURS D'ONBOARDING ─────────────────────────────────── */}
        <section
          className="relative mt-12 overflow-hidden rounded-2xl bg-muted/60 px-4 py-12 sm:px-6 md:py-16"
          aria-labelledby="parcours-title"
        >
          {/* Rondeau decoratif : casse la monotonie du fond clair sans
              concurrencer le contenu. */}
          <span
            aria-hidden
            className="recruit-halo -top-20 right-0 -z-10 size-64 opacity-[0.07]"
          />
          <div className="relative max-w-2xl">
            <h2
              id="parcours-title"
              className="text-3xl font-bold tracking-tight text-foreground md:text-4xl"
            >
              Votre parcours pour rejoindre Relio
            </h2>
            <p className="mt-3 text-base text-muted-foreground md:text-lg">
              4 étapes pour commencer à recevoir des missions. Vous avancez à votre
              rythme : votre compte est créé dès l&apos;inscription, chaque étape se fait
              quand vous le décidez.
            </p>
          </div>

          {/* Illustration du parcours : elle résume les 4 étapes qui suivent,
              et le degradé la fait fondre dans la section au lieu de la poser
              comme une carte de plus. */}
          <div className="relative mt-8 overflow-hidden rounded-3xl md:mt-12">
            <Image
              src="/technicien/parcours-illustration.png"
              alt="Un technicien Relio et son parcours"
              width={1600}
              height={900}
              sizes="(max-width: 1023px) 100vw, 1152px"
              className="h-auto w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-muted/60 to-transparent" />
          </div>

          <ol className="mt-8 grid gap-4 sm:grid-cols-2 md:gap-6">
            {ONBOARDING_STEP_DEFS.map((step, index) => (
              <li
                key={step.id}
                className="card-premium flex flex-col rounded-2xl border border-border bg-card p-6"
              >
                <span
                  aria-hidden
                  className="flex size-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary"
                >
                  {index + 1}
                </span>
                <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{step.description}</p>
                <Link
                  href={step.href}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline underline-offset-4"
                >
                  Commencer
                  <Icon name="arrow-right" size="sm" />
                </Link>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-muted-foreground">
            L&apos;identité et le profil conditionnent l&apos;accès aux missions : sans
            dossier vérifié, aucune demande ne vous est proposée.
          </p>
        </section>

        {/* ── 4. UNE INTERVENTION, CONCRÈTEMENT ───────────────────────────── */}
        <section className="mt-12 py-12 md:py-16" aria-labelledby="mission-title">
          <div className="max-w-2xl">
            <h2
              id="mission-title"
              className="text-3xl font-bold tracking-tight text-foreground md:text-4xl"
            >
              Une intervention, concrètement
            </h2>
            <p className="mt-3 text-base text-muted-foreground md:text-lg">
              Ce que vous faites au quotidien, de la prise de contact au paiement.
            </p>
          </div>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 md:gap-6 md:mt-12">
            {MISSION_STEPS.map((step, index) => (
              <li
                key={step.title}
                className={
                  step.highlighted
                    ? 'card-premium flex flex-col rounded-2xl border border-primary/40 bg-primary/5 p-6 sm:col-span-2'
                    : 'card-premium flex flex-col rounded-2xl border border-border bg-card p-6'
                }
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className={
                      step.highlighted
                        ? 'flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground'
                        : 'flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary'
                    }
                  >
                    <Icon name={step.icon} size="md" />
                  </span>
                  <p className="text-xs font-bold text-primary">Étape {index + 1}</p>
                </div>
                <h3 className="mt-3 flex items-center gap-2 text-base font-semibold">
                  {step.title}
                  {step.highlighted ? (
                    <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
                      La clé
                    </span>
                  ) : null}
                </h3>
<p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-muted-foreground">
            {relioAbsorbsTransferFeesNote('mission')} Le montant affiché est celui que vous
            encaissez.
          </p>
        </section>

        {/* ── 5. POURQUOI REJOINDRE RELIO ─────────────────────────────────── */}
        <section
          className="relative mt-12 overflow-hidden rounded-2xl bg-muted/60 px-4 py-12 sm:px-6 md:py-16"
          aria-labelledby="arguments-title"
        >
          <span
            aria-hidden
            className="recruit-halo -bottom-24 -left-16 -z-10 size-72 opacity-[0.07]"
          />
          <div className="relative">
            <h2
              id="arguments-title"
              className="text-3xl font-bold tracking-tight text-foreground md:text-4xl"
            >
              Pourquoi rejoindre Relio ?
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 md:mt-12 md:gap-6 xl:grid-cols-3">
              {ARGUMENTS.map((item) => (
                <div
                  key={item.title}
                  className="card-premium rounded-2xl border border-border bg-card p-6"
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon name={item.icon} size="md" />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. LE BARÈME, SANS PROMESSE ─────────────────────────────────── */}
        <section className="mt-12 py-12 md:py-16" aria-labelledby="tarifs-title">
          <div className="max-w-2xl">
            <h2
              id="tarifs-title"
              className="text-3xl font-bold tracking-tight text-foreground md:text-4xl"
            >
              Combien vous pouvez gagner
            </h2>
            <p className="mt-3 text-base text-muted-foreground md:text-lg">
              Voici ce que vous recevez selon le montant du devis. Les chiffres sont calculés
              à partir du barème Relio, ils ne sont pas une estimation.
            </p>
          </div>

          {/* Tableau sur grand écran, cartes empilées sur mobile : le même
              contenu, deux présentations. Un tableau à 2 colonnes ne se lit pas
              sur 375 px, et une carte ne se compare pas sur desktop. */}
          <table className="mt-8 hidden w-full border-collapse overflow-hidden rounded-2xl border border-border text-sm sm:table md:mt-12">
            <caption className="sr-only">
              Montant du devis et montant net versé au technicien
            </caption>
            <thead>
              <tr className="bg-muted">
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Devis technicien
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Vous recevez
                </th>
              </tr>
            </thead>
            <tbody>
              {QUOTE_AMOUNTS_XAF.map((amount) => {
                const preview = previewTechnicianQuote(amount);
                return (
                  <tr key={amount} className="border-t border-border bg-card">
                    <td className="px-4 py-3">{formatFCFA(preview.quote)}</td>
                    <td className="px-4 py-3 font-semibold text-primary">
                      {formatFCFA(preview.net)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <ul className="mt-8 grid gap-4 sm:hidden md:mt-12">
            {QUOTE_AMOUNTS_XAF.map((amount) => {
              const preview = previewTechnicianQuote(amount);
              return (
                <li
                  key={amount}
                  className="card-premium flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
                >
                  <span className="text-sm text-muted-foreground">
                    Devis {formatFCFA(preview.quote)}
                  </span>
                  <span className="text-base font-semibold text-primary">
                    {formatFCFA(preview.net)}
                  </span>
                </li>
              );
            })}
          </ul>

          <p className="mt-4 text-sm text-muted-foreground">
            {TECHNICIAN_FEE_LABEL}. {relioAbsorbsTransferFeesNote('mission')}
          </p>
        </section>

        {/* ── 7. SÉLECTIVITÉ ──────────────────────────────────────────────── */}
        <section
          className="relative mt-12 overflow-hidden rounded-2xl bg-muted/60 px-4 py-12 sm:px-6 md:py-16"
          aria-labelledby="attentes-title"
        >
          <div className="relative">
            <h2
              id="attentes-title"
              className="text-3xl font-bold tracking-tight text-foreground md:text-4xl"
            >
              Ce qu&apos;on attend de vous
            </h2>
            <p className="mt-3 max-w-2xl text-base text-muted-foreground md:text-lg">
              Nous ne recrutons pas tout le monde. C&apos;est ce qui fait la qualité du réseau
              Relio.
            </p>
            <ul className="mt-8 grid gap-4 md:mt-12 md:gap-6 md:grid-cols-2">
              {EXPECTATIONS.map((item) => (
                <li
                  key={item.label}
                  className="card-premium flex items-start gap-3 rounded-2xl border border-border bg-card p-4"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon name={item.icon} size="sm" />
                  </span>
                  <p className="pt-1 text-sm">{item.label}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              Le dossier est vérifié par l&apos;équipe Relio avant votre première mission.
            </p>
          </div>
        </section>

        {/* ── 8. L'ENGAGEMENT DE LA PLATEFORME ─────────────────────────────── */}
        <section className="mt-12 py-12 md:py-16" aria-labelledby="engagement-title">
          <h2
            id="engagement-title"
            className="text-3xl font-bold tracking-tight text-foreground md:text-4xl"
          >
            Notre engagement envers vous
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 md:mt-12 md:gap-6">
            {COMMITMENTS.map((item) => (
              <div
                key={item.title}
                className="card-premium rounded-2xl border border-border bg-card p-6"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon name={item.icon} size="md" />
                </span>
                <h3 className="mt-3 text-sm font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 9. FAQ TECHNICIEN ────────────────────────────────────────────── */}
        <section
          className="mt-12 overflow-hidden rounded-2xl bg-muted/60 px-4 py-12 sm:px-6 md:py-16"
          aria-labelledby="faq-technicien-title"
        >
          <div className="max-w-2xl">
            <h2
              id="faq-technicien-title"
              className="text-3xl font-bold tracking-tight text-foreground md:text-4xl"
            >
              Questions fréquentes
            </h2>
            <p className="mt-3 text-base text-muted-foreground md:text-lg">
              Les questions que les techniciens nous posent le plus souvent avant de
              s&apos;inscrire.
            </p>
          </div>
          <div className="mt-8 space-y-3 md:mt-12">
            {FAQ.map((item) => (
              <details
                key={item.question}
                className="group overflow-hidden rounded-2xl border border-border bg-card shadow-[0_2px_8px_rgb(15_23_42/0.04)] open:border-primary/40"
              >
                <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-3 p-5 font-medium transition-colors hover:bg-muted/50 md:p-6 [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-300 group-open:rotate-180">
                    <Icon name="chevron-down" size="sm" />
                  </span>
                </summary>
                <div className="border-t border-border px-5 pb-5 pt-4 text-sm leading-relaxed text-muted-foreground md:px-6 md:pb-6">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ── 10. CTA FINAL ────────────────────────────────────────────────── */}
        <section className="relative mt-12 overflow-hidden rounded-2xl bg-relio-bg p-6 text-center sm:p-10">
          <span
            aria-hidden
            className="recruit-halo -top-24 left-1/2 -z-10 size-72 -translate-x-1/2 opacity-20 sm:size-96"
          />
          <span className="relative mx-auto flex size-12 items-center justify-center rounded-full bg-white/10 text-white">
            <Icon name="sparkles" size="lg" />
          </span>
          <h2 className="relative mt-3 text-2xl font-bold tracking-tight text-white md:text-3xl">
            Prêt à rejoindre Relio ?
          </h2>
          <p className="relative mx-auto mt-2 max-w-sm text-sm text-white/75">
            Inscription gratuite. Aucun engagement.
          </p>
          <div className="relative mt-5 flex flex-col gap-2 sm:mx-auto sm:max-w-xl sm:flex-row">
            <Link href={SIGNUP_HREF} className="w-full">
              <Button size="lg" className="w-full bg-primary text-primary-foreground hover:opacity-90 sm:flex-1">
                {SIGNUP_LABEL}
              </Button>
            </Link>
            <Link href={SIGNIN_HREF} className="w-full">
              <Button
                variant="secondary"
                size="lg"
                className="w-full border-white/20 bg-white/10 text-white hover:bg-white/15 sm:flex-1"
              >
                {SIGNIN_CTA_LABEL}
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
