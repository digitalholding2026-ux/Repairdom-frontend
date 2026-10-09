'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon, type IconName } from '@/components/ui/icon';
import { InterventionsCard } from '@/components/technician/dashboard/interventions-card';
import { DashboardSkeleton } from '@/components/technician/dashboard/dashboard-skeleton';
import { TechShell } from '@/components/technician/dashboard/tech-shell';
import { AnimateOnScroll } from '@/components/landing/animate-on-scroll';
import {
  TechAccountRow,
  TechActivityCard,
  TechKpiCard,
  TechMissionRow,
  TechRadarCard,
  TechStatusCard,
} from '@/components/technician/dashboard/tech-overview';
import {
  type ActivityItem,
  type ActivityTone,
} from '@/components/client/dashboard/activity-feed';
import { getMe, logoutAndGoHome } from '@/lib/api/auth-service';
import {
  listAvailableDemandes,
  listMyDemandes,
  listMyDemandeHistory,
  getTechnicianProfile,
  updateTechnicianAvailability,
  type TechnicianDemande,
  type TechnicianProfile,
} from '@/lib/api/technician-service';
import { getTechnicianFinanceSummary, type TechnicianFinanceSummary } from '@/lib/api/finance-service';
import { demandeStatusConfig } from '@/lib/request-status';
import { formatCurrency, fullName } from '@/lib/format';
import { OnboardingBanner } from '@/components/technician/onboarding/onboarding-banner';
import { OnboardingChecklist } from '@/components/technician/onboarding/onboarding-checklist';
import { useOnboardingBannerVisibility } from '@/lib/technician/use-onboarding-banner-visibility';
import { useOnboardingState } from '@/lib/technician/use-onboarding-state';
import {
  kycDashboardBanner,
  kycStatusLabel,
  KYC_PAGE_HREF,
  type KycDashboardBanner,
} from '@/lib/technician-kyc-rules';
import { useUserStream } from '@/lib/realtime/use-user-stream';
import { toUserErrorMessage } from '@/lib/ui-error-message';

/* Chantier #5A — classes du bandeau KYC du dashboard. Le dashboard est en
 * thème SOMBRE (fond `relio-bg`) : on n'utilise pas le `Alert` du design
 * system, trop clair sur ce fond. Le fond, la bordure et le texte de chaque
 * ton sont déclarés ici, une seule fois. */
const KYC_BANNER_TONES: Record<
  KycDashboardBanner['variant'],
  { shell: string; title: string; body: string; cta: string }
> = {
  error: {
    shell: 'border-red-500/30 bg-red-500/10',
    title: 'text-red-300',
    body: 'text-red-200/80',
    cta: 'border-red-400/40 bg-red-500/15 text-red-100 hover:bg-red-500/25',
  },
  warning: {
    shell: 'border-amber-500/30 bg-amber-500/10',
    title: 'text-amber-300',
    body: 'text-amber-200/80',
    cta: 'border-amber-400/40 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25',
  },
  info: {
    shell: 'border-white/10 bg-white/5',
    title: 'text-slate-200',
    body: 'text-slate-300/80',
    cta: 'border-white/20 bg-white/10 text-slate-100 hover:bg-white/15',
  },
};

const ACTIVE_STATUSES = ['ACCEPTED', 'SCHEDULED', 'IN_PROGRESS'];

const STATUS_FEED_ICONS: Record<string, IconName> = {
  ACCEPTED: 'users',
  SCHEDULED: 'calendar',
  IN_PROGRESS: 'truck',
  COMPLETED: 'check-circle',
  CONFIRMED: 'badge-check',
  CANCELED: 'x',
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

export default function TechnicianDashboardPage() {
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [available, setAvailable] = useState<TechnicianDemande[]>([]);
  const [mine, setMine] = useState<TechnicianDemande[]>([]);
  const [history, setHistory] = useState<TechnicianDemande[]>([]);
  const [finance, setFinance] = useState<TechnicianFinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  /* Chantier #5C — onboarding : la checklist ne s'affiche que tant qu'une
   * étape manque, et la bannière de bienvenue une seule fois par navigateur.
   * Le dashboard reste entièrement fonctionnel si ces deux hooks échouent
   * (erreur réseau) : ils ne pilotent rien d'existant. */
  const onboarding = useOnboardingState();
  const onboardingBanner = useOnboardingBannerVisibility();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const me = await getMe();
        if (cancelled) return;
        if (me.role !== 'TECHNICIAN') {
          setError('Votre compte n\'est pas un compte technicien.');
          setLoading(false);
          return;
        }
        const [profileData, availableList, myList, historyList] = await Promise.all([
          getTechnicianProfile(),
          listAvailableDemandes(),
          listMyDemandes(),
          listMyDemandeHistory(),
        ]);
        if (!cancelled) {
          setProfile(profileData);
          setAvailable(availableList);
          setMine(myList);
          setHistory(historyList);
        }
        getTechnicianFinanceSummary()
          .then((f) => { if (!cancelled) setFinance(f); })
          .catch(() => undefined);
      } catch (err) {
        if (!cancelled) setError(toUserErrorMessage(err, 'Erreur de chargement.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  /* Chantier #5A — décision KYC prise par un admin : le bandeau doit
   * s'inverser (ou disparaître) SANS rechargement. Seul le profil est
   * refetché : ni les missions, ni les KPIs ne sont recalculés. */
  useUserStream((message) => {
    if (
      message.type !== 'technician.kyc_verified' &&
      message.type !== 'technician.kyc_rejected'
    ) {
      return;
    }
    getTechnicianProfile()
      .then((updated) => setProfile(updated))
      .catch(() => undefined);
  });

  const handleLogout = async () => {
    await logoutAndGoHome();
  };

  const handleToggleAvailability = async () => {
    if (!profile) return;
    setAvailabilityBusy(true);
    setAvailabilityError(null);
    try {
      const updated = await updateTechnicianAvailability(!profile.isAvailable);
      setProfile(updated);
      // La disponibilité conditionne l’éligibilité dispatch : recharger les
      // missions proposées pour garder le compteur cohérent.
      setAvailable(await listAvailableDemandes());
    } catch (err) {
      setAvailabilityError(
        toUserErrorMessage(err, 'Erreur lors de la mise à jour de la disponibilité.'),
      );
    } finally {
      setAvailabilityBusy(false);
    }
  };

  const refreshAvailable = async () => {
    setRefreshing(true);
    try {
      setAvailable(await listAvailableDemandes());
    } catch {
      /* Le radar garde les dernières données en cas d'échec réseau. */
    } finally {
      setRefreshing(false);
    }
  };

  const currentMission = useMemo(() => {
    const active = mine
      .filter((d) => ACTIVE_STATUSES.includes(d.status))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return active[0] ?? null;
  }, [mine]);

  const mineList = useMemo(
    () => mine.filter((d) => !currentMission || d.id !== currentMission.id),
    [mine, currentMission],
  );

  const todayRange = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }, []);

  const completedToday = useMemo(() => {
    return history.filter(
      (d) => d.status === 'CONFIRMED' && new Date(d.createdAt) >= todayRange,
    ).length;
  }, [history, todayRange]);

  const todayRevenue = useMemo(() => {
    return history
      .filter((d) => d.status === 'CONFIRMED' && new Date(d.createdAt) >= todayRange)
      .reduce((sum, d) => sum + (d.finalAmount ?? 0), 0);
  }, [history, todayRange]);

  const activities = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];

    for (const d of mine) {
      const config = demandeStatusConfig(d.status, 'technician');
      const tone: ActivityTone = d.status === 'IN_PROGRESS' ? 'primary' : 'info';
      items.push({
        id: `d-${d.id}`,
        icon: STATUS_FEED_ICONS[d.status] ?? 'wrench',
        tone,
        title: `Mission ${d.reference}`,
        subtitle: `${config.label} · ${d.categoryLabel}`,
        createdAt: d.createdAt,
        href: `/technicien/demandes/${d.id}`,
      });
    }

    for (const d of history) {
      const confirmed = d.status === 'CONFIRMED';
      items.push({
        id: `h-${d.id}`,
        icon: confirmed ? 'badge-check' : 'x',
        tone: confirmed ? 'success' : 'warning',
        title: confirmed ? 'Intervention terminée' : 'Mission annulée',
        subtitle: `${d.reference} · ${d.categoryLabel}`,
        amount: confirmed ? (d.finalAmount ?? undefined) : undefined,
        currency: confirmed ? 'FCFA' : undefined,
        createdAt: d.createdAt,
        href: '/technicien/historique',
      });
    }

    return items
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  }, [mine, history]);

  /* Les deux sorties anticipées passent par la même coque que le rendu
   * final : le fond sombre ne peut plus manquer à l'un d'eux. */
  if (loading) {
    return (
      <TechShell>
        <DashboardSkeleton />
      </TechShell>
    );
  }

  if (error) {
    return (
      <TechShell>
        <EmptyState
          title="Accès requis"
          description={error}
          action={
            <Link href="/technicien/connexion">
              <Button>Se connecter en tant que technicien</Button>
            </Link>
          }
        />
      </TechShell>
    );
  }

  const firstName = profile?.user.firstName ?? null;
  const greeting = getGreeting();
  const zone = profile?.city?.trim() || 'votre zone';
  const verified = profile?.kycStatus === 'VERIFIED';
  /* Chantier #5A — bandeau d'étape du dossier KYC. Adapté au statut réel :
   * un dossier REFUSÉ n'affiche pas « Vérification en cours », et un dossier
   * en cours d'examen ne propose pas de « corriger » un dossier qu'on examine. */
  const kycBanner = kycDashboardBanner(profile?.kycStatus, profile?.kycRejectionReason);
  const interventions = profile?.completedInterventions ?? history.filter((d) => d.status === 'CONFIRMED').length;
  const clientName = currentMission?.client
    ? fullName(currentMission.client.firstName, currentMission.client.lastName)
    : null;

  /* Chantier #5C — la checklist disparaît TOTALEMENT quand les 4 étapes sont
   * faites : un « 4/4 » sur le dashboard n'apprend rien au technicien. Tant
   * qu'on charge, on ne l'affiche pas non plus (sinon elle clignote 0/4 puis
   * se corrige), et une erreur réseau ne doit pas laisser une checklist vide
   * à 0/4 qui mentirait sur sa situation. */
  const showChecklist = !onboarding.loading && !onboarding.error && !onboarding.isComplete;
  /* La bannière s'affiche au PREMIER passage seulement, et seulement si
   * l'onboarding est incomplet. Dismissed = silencieuse à jamais sur ce
   * navigateur, même si l'onboarding reste incomplet. */
  const showBanner =
    onboardingBanner.ready &&
    !onboardingBanner.dismissed &&
    !onboarding.loading &&
    !onboarding.error &&
    !onboarding.isComplete;

  return (
    <TechShell>
      {/* ── Header contenu : salutation + statut + déconnexion ── */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Espace technicien
          </p>
          <h1 className="mt-1 break-words text-xl font-bold tracking-tight text-white sm:text-2xl">
            {greeting}{firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone="dark" variant={verified ? 'success' : 'warning'} className="gap-1">
              <Icon name={verified ? 'shield-check' : 'alert'} size="3.5" />
              {verified ? 'Technicien Vérifié' : kycStatusLabel(profile?.kycStatus ?? 'NOT_SUBMITTED')}
            </Badge>
            <Badge tone="dark" variant="neutral" className="gap-1">
              <Icon name="pin" size="3.5" />
              {zone}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="md"
          onClick={handleLogout}
          className="min-h-12 shrink-0 border border-relio-border bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
        >
          <Icon name="logout" size="sm" />
          <span className="ml-1 hidden sm:inline">Déconnexion</span>
        </Button>
      </header>

      {/* ── Intervention en cours ──────────────────────────────────
          Premier bloc de contenu, AVANT tout le reste.
          C'est l'élément le plus temporel de l'écran : une intervention
          acceptée se joue à une heure donnée, et un technicien qui la
          découvre en arrivant doit la voir sans faire défiler. Elle était
          surtout sixth bloc — sous trois cartes de chiffres et deux bandeaux
          — donc hors du premier écran sur un téléphone. */}
      {currentMission ? (
        <AnimateOnScroll delay={0}>
          <Link
            href={`/technicien/demandes/${currentMission.id}`}
            className="block min-h-13 rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-500/20 via-orange-500/10 to-transparent p-4 transition-colors hover:border-orange-500/50 sm:p-5"
          >
            <div className="flex items-center gap-3">
              <span className="relative flex size-3 shrink-0" aria-hidden>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex size-3 rounded-full bg-orange-400" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-orange-300">
                  Intervention en cours
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-white">
                  {currentMission.reference} · {currentMission.categoryLabel}
                  {clientName ? ` · ${clientName}` : ''}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-orange-200">
                Reprendre
                <Icon name="chevron-right" size="sm" />
              </span>
            </div>
          </Link>
        </AnimateOnScroll>
      ) : null}

      {/* ── Checklist d'onboarding (chantier #5C) ────────────────
          Juste après l'en-tête, AVANT le bandeau KYC (#5A) : l'ordre des
          étapes suit la progression réelle, et KYC n'est qu'une étape parmi
          quatre. `tone="dark"` : le dashboard est en thème sombre forcé
          (fond `relio-bg`), les jetons `bg-card` y rendraient une carte
          CLAIRE sur fond noir — même piège que les catégories sur la
          coquille split (#5B). */}
      {showChecklist ? (
        <OnboardingChecklist state={onboarding} tone="dark" />
      ) : null}

      {/* ── Bannière de bienvenue (chantier #5C) ───────────────────
          Premier passage uniquement. Elle ne fait QUE de l'orientation vers
          le guide : la checklist, elle, reste jusqu'aux 4 étapes. */}
      {showBanner ? (
        <OnboardingBanner
          tone="dark"
          onDismiss={onboardingBanner.dismiss}
          /* Le CTA mène au guide : le technicien est déjà en route, donc on
           * consomme la bannière pour ne plus la lui reproposer. */
          onNavigate={onboardingBanner.dismiss}
        />
      ) : null}

      {/* ── Bandeau KYC (chantier #5A) ──────────────────────────
          Bandeau INLINE en haut du dashboard, jamais une modale : il informe
          sans interrompre la navigation. Il n'apparaît QUE si le dossier n'est
          pas vérifié (un technicien vérifié n'a rien à faire ici). */}
      {kycBanner ? (
        <div
          role="status"
          className={`flex flex-wrap items-center gap-3 rounded-2xl border p-4 ${KYC_BANNER_TONES[kycBanner.variant].shell}`}
        >
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold ${KYC_BANNER_TONES[kycBanner.variant].title}`}>
              {kycBanner.title}
            </p>
            <p className={`mt-0.5 text-sm ${KYC_BANNER_TONES[kycBanner.variant].body}`}>
              {kycBanner.description}
            </p>
          </div>
          {kycBanner.ctaLabel ? (
            <Link href={KYC_PAGE_HREF} className="shrink-0">
              <Button variant="ghost" size="md" className={`min-h-12 ${KYC_BANNER_TONES[kycBanner.variant].cta}`}>
                {kycBanner.ctaLabel}
              </Button>
            </Link>
          ) : null}
        </div>
      ) : null}

      {/* ── A + B : statut + KPIs ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Cascade d'apparition : chaque bloc se lève légèrement après le
            précédent, ce qui guide l'œil dans l'ordre de lecture au lieu de
            tout faire apparaître d'un coup. 80 ms d'écart — au-delà, la
            page « arrive » au lieu de se composer. */}
        <div className="md:col-span-2 lg:col-span-1">
          <AnimateOnScroll delay={80}>
            <TechStatusCard
              isAvailable={profile?.isAvailable ?? false}
              busy={availabilityBusy}
              error={availabilityError}
              zone={zone}
              onToggle={() => void handleToggleAvailability()}
            />
          </AnimateOnScroll>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6 md:col-span-2 lg:col-span-2 lg:grid-cols-3">
          <AnimateOnScroll delay={120}>
            <TechKpiCard
              icon="briefcase"
              label="Revenus du jour"
              value={formatCurrency(todayRevenue, finance?.currency ?? 'XAF')}
              numeric={todayRevenue}
              format={(n) => formatCurrency(n, finance?.currency ?? 'XAF')}
              sub={`${completedToday} dépannage${completedToday !== 1 ? 's' : ''} aujourd'hui`}
              href="/technicien/revenus"
              accent="emerald"
            />
          </AnimateOnScroll>
          <AnimateOnScroll delay={180}>
            <TechKpiCard
              icon="wrench"
              label="Interventions"
              value={`${interventions} / 10`}
              sub="Palier 1 · dépannages réalisés"
              href="/technicien/historique"
              accent="orange"
            />
          </AnimateOnScroll>
          <AnimateOnScroll delay={240}>
            <TechKpiCard
              icon="star"
              label="Note & Avis"
              value="–"
              sub="Aucun avis client pour le moment"
              accent="amber"
            />
          </AnimateOnScroll>
        </div>
      </div>

      {/* ── C : radar live ────────────────────────────────────── */}
      <TechRadarCard
        zone={zone}
        missions={available.slice(0, 3)}
        total={available.length}
        refreshing={refreshing}
        onRefresh={() => void refreshAvailable()}
      />

      {/* ── D : activité + progression ────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TechActivityCard items={activities} />
        </div>
        <div>
          <InterventionsCard completedCount={interventions} />
        </div>
      </div>

      {/* ── Mes interventions ─────────────────────────────────── */}
      {mineList.length > 0 ? (
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
              <Icon name="briefcase" size="sm" className="text-orange-400" />
              Mes interventions
            </h2>
            <Badge tone="dark" variant="success" className="shrink-0">
              {mineList.length} intervention{mineList.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            {mineList.map((d) => (
              <TechMissionRow key={d.id} demande={d} />
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Mon compte ────────────────────────────────────────── */}
      {profile ? <TechAccountRow profile={profile} /> : null}

      {/* Espace de respiration au-dessus de la navigation basse mobile */}
      <div aria-hidden className="lg:hidden" />
    </TechShell>
  );
}
