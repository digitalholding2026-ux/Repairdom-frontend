'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';

/* CHANTIER UI DESKTOP & MOBILE — blocs présentation PARTAGÉS de l'accueil
 * client (mêmes données, mêmes libellés, mêmes actions). Seules la
 * composition et la densité divergent entre `ClientHomeMobileView` et
 * `ClientHomeDesktopView`. */

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

/** Icône du métier affichée sur fond ambre/orange léger. */
export function categoryIcon(label: string): IconName {
  const l = label.toLowerCase();
  if (l.includes('elec')) return 'zap';
  if (l.includes('plomb') || l.includes('sanitaire') || l.includes('eau')) return 'droplet';
  if (l.includes('clim') || l.includes('froid') || l.includes('chauff') || l.includes('therm'))
    return 'thermometer';
  if (l.includes('info') || l.includes('ordi') || l.includes('télé') || l.includes('tele'))
    return 'cpu';
  return 'wrench';
}

/** Badge de statut pill : sémantique design system (warning/info/success/muted). */
export function RecentStatusPill({ status, confirmationStatus }: { status: string; confirmationStatus?: string | null }) {
  // Badge de statut principal
  let baseBadge: React.ReactElement | null = null;
  if (status === 'SUBMITTED' || status === 'PENDING') {
    baseBadge = (
      <span className="shrink-0 rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning-ink">
        En attente
      </span>
    );
  }
  if (status === 'ACCEPTED' || status === 'SCHEDULED' || status === 'IN_PROGRESS') {
    baseBadge = (
      <span className="shrink-0 rounded-full bg-info-soft px-3 py-1 text-xs font-semibold text-info-ink">
        En cours
      </span>
    );
  }
  if (status === 'COMPLETED' || status === 'CONFIRMED') {
    baseBadge = (
      <span className="shrink-0 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success-ink">
        Terminé
      </span>
    );
  }
  baseBadge = baseBadge ?? (
    <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
      Annulée
    </span>
  );

  // Badge de confirmation WhatsApp (affiché en complément du statut)
  let confirmationBadge: React.ReactElement | null = null;
  if (confirmationStatus === 'PENDING') {
    confirmationBadge = (
      <span className="shrink-0 rounded-full border border-warning/30 bg-warning/5 p-2 px-2 text-xs font-semibold text-warning-ink">
        En attente de confirmation
      </span>
    );
  }
  if (confirmationStatus === 'CONFIRMED') {
    confirmationBadge = (
      <span className="shrink-0 rounded-full border border-success/30 bg-success/5 p-2 px-2 text-xs font-semibold text-success-ink">
        RDV confirmé
      </span>
    );
  }

  return (
    <>
      {baseBadge}
      {confirmationBadge}
    </>
  );
}

/** Confirmation WhatsApp badge : affiché sur les cartes de demande pour
 *  indiquer le statut de confirmation du rendez-vous. */
export function ConfirmationStatusBadge({ confirmationStatus }: { confirmationStatus?: string | null }) {
  if (confirmationStatus === 'PENDING') {
    return (
      <span className="shrink-0 rounded-full border border-warning/30 bg-warning/5 p-2 px-2 text-xs font-semibold text-warning-ink">
        En attente de confirmation
      </span>
    );
  }
  if (confirmationStatus === 'CONFIRMED') {
    return (
      <span className="shrink-0 rounded-full border border-success/30 bg-success/5 p-2 px-2 text-xs font-semibold text-success-ink">
        RDV confirmé
      </span>
    );
  }
  return null;
}

const REASSURANCE_CARDS: Array<{ icon: IconName; title: string; text: string }> = [
  {
    icon: 'shield-check',
    title: 'Expertise Relio',
    text: 'Intervention à domicile par un professionnel qualifié de l’équipe Relio.',
  },
  {
    icon: 'wallet',
    title: 'Paiement à la fin',
    text: 'Payez uniquement une fois la réparation terminée et validée. Aucun frais caché.',
  },
  {
    icon: 'clock',
    title: 'Intervention rapide',
    text: 'Un technicien disponible près de chez vous, au créneau qui vous convient.',
  },
];

/* État vide animé de « Mes missions » + cartes de réassurance. */
export function MissionsEmptyState() {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/10">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-2xl bg-slate-300/40 opacity-75 dark:bg-white/10" />
        <Icon name="wrench" size="xl" className="relative z-10 h-10 w-10 text-slate-500 dark:text-slate-300" />
      </div>
      <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
        Aucune demande en cours
      </h3>
      <p className="mb-6 max-w-md text-sm text-slate-500 dark:text-slate-400">
        Besoin d\u2019un d\u00e9pannage informatique, d\u2019une r\u00e9paration de smartphone
        ou d\u2019un d\u00e9blocage ? D\u00e9posez votre demande en 2 minutes. Un expert
        Relio vous contactera sur WhatsApp pour confirmer votre rendez-vous.
      </p>
      <Link href='/demande'>
          <Button
            size="lg"
            className="shadow-lg shadow-primary/25 transition-all duration-200 hover:scale-[1.02] hover:shadow-primary/40 active:scale-[0.98]"
          >
            <Icon name="plus" size="sm" />
            Déposer une demande
          </Button>
      </Link>
      <div className="mt-8 grid w-full grid-cols-1 gap-4 border-t border-slate-100 pt-8 dark:border-slate-800/60 md:grid-cols-3">
        {REASSURANCE_CARDS.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-slate-200/50 bg-slate-50/80 p-4 text-left dark:border-slate-700/40 dark:bg-slate-800/40"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
              <Icon name={card.icon} size="md" />
            </span>
            <p className="mt-3 text-sm font-semibold">{card.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{card.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

